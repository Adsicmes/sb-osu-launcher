use notify::{Config, Event, RecommendedWatcher, RecursiveMode, Watcher, EventKind};
use std::path::{Path, PathBuf};
use std::sync::{mpsc::channel, Arc, Mutex};
use std::collections::HashMap;
use std::fs;
use std::time::{Duration, Instant};
use std::io::{self, Read};
use tauri::{AppHandle, Emitter, Manager, Runtime, State};

// 定义事件数据结构
#[derive(Clone, serde::Serialize)]
pub struct FileChangeEvent {
    pub path: String,
    pub event_type: String,
    pub username: String,
    pub success: bool,
    pub message: String,
}

// 定义状态结构体
#[derive(Clone, serde::Serialize)]
pub struct ProfileCopyResult {
    pub username: String,
    pub success: bool,
    pub message: String,
}

// 修改WatcherState，使其可以被克隆
#[derive(Clone)]
pub struct WatcherState {
    watchers: Arc<Mutex<HashMap<String, RecommendedWatcher>>>,
    last_copy_time: Arc<Mutex<Instant>>,
    current_osu_path: Arc<Mutex<String>>,
}

impl WatcherState {
    pub fn new() -> Self {
        Self {
            watchers: Arc::new(Mutex::new(HashMap::new())),
            last_copy_time: Arc::new(Mutex::new(Instant::now().checked_sub(Duration::from_secs(1)).unwrap_or(Instant::now()))),
            current_osu_path: Arc::new(Mutex::new(String::new())),
        }
    }
    
    // 获取当前设置的 osu 路径
    pub fn get_osu_path(&self) -> String {
        let path_lock = self.current_osu_path.lock().unwrap_or_else(|e| {
            eprintln!("获取路径锁失败: {}", e);
            panic!("获取路径锁失败");
        });
        path_lock.clone()
    }
    
    // 设置 osu 路径
    pub fn set_osu_path(&self, path: &str) {
        let mut path_lock = self.current_osu_path.lock().unwrap_or_else(|e| {
            eprintln!("获取路径锁失败: {}", e);
            panic!("获取路径锁失败");
        });
        *path_lock = path.to_string();
    }
    
    // 检查冷却时间
    pub fn check_cooldown(&self) -> bool {
        let mut last_time_lock = self.last_copy_time.lock().unwrap_or_else(|e| {
            eprintln!("获取时间锁失败: {}", e);
            panic!("获取时间锁失败");
        });
        
        let now = Instant::now();
        let elapsed = now.duration_since(*last_time_lock);
        
        // 冷却时间设为100毫秒
        if elapsed < Duration::from_millis(100) {
            return false; // 在冷却期内
        }
        
        // 更新最后复制时间
        *last_time_lock = now;
        true // 可以复制
    }
}

impl Default for WatcherState {
    fn default() -> Self {
        Self::new()
    }
}

// 从配置文件中提取用户名
fn extract_username_from_config(config_path: &Path) -> Result<String, String> {
    let mut file = fs::File::open(config_path)
        .map_err(|e| format!("打开配置文件失败: {}", e))?;
    
    let mut content = String::new();
    file.read_to_string(&mut content)
        .map_err(|e| format!("读取配置文件内容失败: {}", e))?;
    
    // 查找 Username 字段
    for line in content.lines() {
        if line.starts_with("Username = ") {
            let username = line.trim_start_matches("Username = ").to_string();
            return Ok(username);
        }
    }
    
    // 如果没有找到 Username 字段，返回空字符串
    Ok(String::new())
}

// 从配置文件中提取CredentialEndpoint
fn extract_credential_endpoint_from_config(config_path: &Path) -> Result<String, String> {
    let mut file = fs::File::open(config_path)
        .map_err(|e| format!("打开配置文件失败: {}", e))?;
    
    let mut content = String::new();
    file.read_to_string(&mut content)
        .map_err(|e| format!("读取配置文件内容失败: {}", e))?;
    
    // 查找 CredentialEndpoint 字段
    for line in content.lines() {
        if line.starts_with("CredentialEndpoint = ") {
            let endpoint = line.trim_start_matches("CredentialEndpoint = ").to_string();
            if endpoint.is_empty() {
                return Ok("ppy.sh".to_string());
            }
            return Ok(endpoint);
        }
    }
    
    // 如果没有找到 CredentialEndpoint 字段，返回默认值
    Ok("ppy.sh".to_string())
}

// 生成目标文件夹名称
fn generate_folder_name(username: &str, endpoint: &str) -> String {
    // 将endpoint中的.替换为_
    let normalized_endpoint = endpoint.replace(".", "_");
    format!("{}____{}", username, normalized_endpoint)
}

// 获取当前计算机用户名
fn get_system_username() -> String {
    whoami::username()
}

// 获取应用数据目录
fn get_app_data_dir<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, String> {
    let app_data_dir = app.path().app_data_dir()
        .map_err(|e| format!("获取应用数据目录失败: {}", e))?;
    
    let profiles_dir = app_data_dir.join("osu_client_profiles");
    
    // 确保目录存在
    fs::create_dir_all(&profiles_dir)
        .map_err(|e| format!("创建配置文件目录失败: {}", e))?;
    
    Ok(profiles_dir)
}

// 复制文件或目录
fn copy_path_recursive(src: &Path, dst: &Path) -> io::Result<()> {
    if src.is_file() {
        fs::create_dir_all(dst.parent().unwrap())?;
        fs::copy(src, dst)?;
    } else if src.is_dir() {
        fs::create_dir_all(dst)?;
        
        for entry in fs::read_dir(src)? {
            let entry = entry?;
            let src_path = entry.path();
            let dst_path = dst.join(entry.file_name());
            
            if src_path.is_file() {
                fs::copy(&src_path, &dst_path)?;
            } else if src_path.is_dir() {
                copy_path_recursive(&src_path, &dst_path)?;
            }
        }
    }
    
    Ok(())
}

// 处理文件变化，复制配置文件和 data\a 目录
fn process_file_change<R: Runtime>(
    app: &AppHandle<R>, 
    state: &WatcherState,
    _event: &FileChangeEvent
) -> ProfileCopyResult {
    // 检查冷却时间
    if !state.check_cooldown() {
        return ProfileCopyResult {
            username: String::new(),
            success: false,
            message: "冷却时间内，忽略操作".to_string(),
        };
    }
    
    // 获取 osu 根目录
    let osu_root = state.get_osu_path();
    if osu_root.is_empty() {
        return ProfileCopyResult {
            username: String::new(),
            success: false,
            message: "未设置 osu 根目录路径".to_string(),
        };
    }
    
    // 构建配置文件路径
    let system_username = get_system_username();
    let config_path = Path::new(&osu_root).join(format!("osu!.{}.cfg", system_username));
    
    // 检查配置文件是否存在
    if !config_path.exists() {
        return ProfileCopyResult {
            username: String::new(),
            success: false,
            message: format!("配置文件不存在: {:?}", config_path),
        };
    }
    
    // 从配置文件提取用户名
    let username = match extract_username_from_config(&config_path) {
        Ok(username) => username,
        Err(e) => {
            return ProfileCopyResult {
                username: String::new(),
                success: false,
                message: e,
            };
        }
    };
    
    // 检查username是否为空
    if username.trim().is_empty() {
        return ProfileCopyResult {
            username: String::new(),
            success: false,
            message: "用户名为空，取消复制操作".to_string(),
        };
    }
    
    // 从配置文件提取CredentialEndpoint
    let credential_endpoint = match extract_credential_endpoint_from_config(&config_path) {
        Ok(endpoint) => endpoint,
        Err(e) => {
            return ProfileCopyResult {
                username: username.clone(),
                success: false,
                message: e,
            };
        }
    };
    
    // 生成目标文件夹名称
    let folder_name = generate_folder_name(&username, &credential_endpoint);
    
    // 获取应用数据目录
    let app_data_dir = match get_app_data_dir(app) {
        Ok(dir) => dir,
        Err(e) => {
            return ProfileCopyResult {
                username: username.clone(),
                success: false,
                message: e,
            };
        }
    };
    
    // 创建用户目录
    let user_dir = app_data_dir.join(&folder_name);
    if let Err(e) = fs::create_dir_all(&user_dir) {
        return ProfileCopyResult {
            username: username.clone(),
            success: false,
            message: format!("创建用户目录失败: {}", e),
        };
    }
    
    // 复制配置文件
    let dst_config = user_dir.join(config_path.file_name().unwrap());
    if let Err(e) = fs::copy(&config_path, &dst_config) {
        return ProfileCopyResult {
            username: username.clone(),
            success: false,
            message: format!("复制配置文件失败: {}", e),
        };
    }
    
    // 复制 data\a 目录
    let src_data_a = Path::new(&osu_root).join("data").join("a");
    let dst_data_a = user_dir.join("a");
    
    if src_data_a.exists() {
        // 如果目标目录已存在，先删除
        if dst_data_a.exists() {
            if let Err(e) = fs::remove_dir_all(&dst_data_a) {
                return ProfileCopyResult {
                    username: username.clone(),
                    success: false,
                    message: format!("清理目标目录失败: {}", e),
                };
            }
        }
        
        // 复制目录
        if let Err(e) = copy_path_recursive(&src_data_a, &dst_data_a) {
            return ProfileCopyResult {
                username: username.clone(),
                success: false,
                message: format!("复制 data\\a 目录失败: {}", e),
            };
        }
    }
    
    // 成功完成复制
    ProfileCopyResult {
        username: username.clone(),
        success: true,
        message: format!("成功将配置文件和 data\\a 目录复制到用户 '{}' 的目录", username),
    }
}

// 文件变化处理函数
fn handle_file_change<R: Runtime>(app: &AppHandle<R>, state: &WatcherState, event: Event) {
    let osu_root = state.get_osu_path();
    if osu_root.is_empty() {
        return;
    }
    
    for path in event.paths {
        if let Some(path_str) = path.to_str() {
            // 检查路径是否在我们关心的范围内
            let path_lower = path_str.to_lowercase();
            let osu_root_lower = osu_root.to_lowercase();
            
            // 规范化路径（替换所有路径分隔符为标准格式）
            let path_normalized = path_lower.replace('\\', "/");
            let osu_root_normalized = osu_root_lower.replace('\\', "/");
            
            // 1. 检查是否在data/a目录下
            let data_a_path = format!("{}/data/a", osu_root_normalized);
            let is_data_a = path_normalized.starts_with(&data_a_path) && 
                          // 确保路径在data/a之后还有内容，或者正好是data/a目录本身
                          (path_normalized.len() > data_a_path.len() || path_normalized == data_a_path);
            
            // 2. 检查是否是配置文件
            let system_username = get_system_username().to_lowercase();
            let config_filename = format!("osu!.{}.cfg", system_username);
            let expected_config_path = format!("{}/{}", osu_root_normalized, config_filename);
            let is_config = path_normalized == expected_config_path;
            
            if !is_data_a && !is_config {
                continue;
            }
            
            let event_type = match event.kind {
                EventKind::Create(_) => "created",
                EventKind::Modify(_) => "modified",
                EventKind::Remove(_) => "removed",
                EventKind::Access(_) => "accessed",
                _ => "other",
            };
            
            // 创建事件数据
            let file_event = FileChangeEvent {
                path: path_str.to_string(),
                event_type: event_type.to_string(),
                username: String::new(), // 后面会填充
                success: false,
                message: String::new(),
            };
            
            // 处理文件变化
            let copy_result = process_file_change(app, state, &file_event);
            
            // 创建结果事件
            let result_event = FileChangeEvent {
                path: path_str.to_string(),
                event_type: event_type.to_string(),
                username: copy_result.username,
                success: copy_result.success,
                message: copy_result.message,
            };
            
            // 向前端发送事件
            emit_profile_copied_event(app, result_event);
        }
    }
}

// 向前端发送事件
fn emit_profile_copied_event<R: Runtime>(app: &AppHandle<R>, event: FileChangeEvent) {
    match app.emit("profile-copied", event) {
        Ok(_) => {},
        Err(e) => eprintln!("发送事件到前端失败: {}", e),
    }
}

// 设置 osu 根目录并开始监控
#[tauri::command]
pub fn set_osu_root_path_profile_watcher(
    app: AppHandle,
    state: State<'_, WatcherState>,
    path: String,
) -> Result<bool, String> {
    // 验证路径
    let osu_path = PathBuf::from(&path);
    if !osu_path.exists() || !osu_path.is_dir() {
        return Err(format!("无效的 osu 根目录路径: {}", path));
    }
    
    // 检查该路径是否为有效的 osu 安装目录
    let system_username = get_system_username();
    let config_path = osu_path.join(format!("osu!.{}.cfg", system_username));
    
    if !config_path.exists() {
        return Err(format!("路径中未找到 osu! 配置文件: {:?}", config_path));
    }
    
    // 更新当前 osu 路径
    state.set_osu_path(&path);
    
    // 清除现有监控器
    let mut watchers_lock = state.watchers.lock().map_err(|e| e.to_string())?;
    watchers_lock.clear();
    
    // 监控配置文件
    let config_path_str = config_path.to_string_lossy().to_string();
    let (tx1, rx1) = channel();
    let mut config_watcher = RecommendedWatcher::new(
        move |res: Result<Event, notify::Error>| {
            if let Ok(event) = res {
                tx1.send(event).unwrap_or_else(|e| {
                    eprintln!("发送事件失败: {}", e);
                });
            }
        },
        Config::default(),
    ).map_err(|e| e.to_string())?;
    
    config_watcher.watch(config_path.as_path(), RecursiveMode::NonRecursive)
        .map_err(|e| format!("监控配置文件失败: {}", e))?;
    
    // 监控 data\a 目录
    let data_a_path = osu_path.join("data").join("a");
    let data_a_path_str = data_a_path.to_string_lossy().to_string();
    
    // 如果 data\a 目录不存在，尝试创建它
    if !data_a_path.exists() {
        fs::create_dir_all(&data_a_path).map_err(|e| format!("创建 data\\a 目录失败: {}", e))?;
    }
    
    let (tx2, rx2) = channel();
    let mut data_watcher = RecommendedWatcher::new(
        move |res: Result<Event, notify::Error>| {
            if let Ok(event) = res {
                tx2.send(event).unwrap_or_else(|e| {
                    eprintln!("发送事件失败: {}", e);
                });
            }
        },
        Config::default(),
    ).map_err(|e| e.to_string())?;
    
    data_watcher.watch(data_a_path.as_path(), RecursiveMode::Recursive)
        .map_err(|e| format!("监控 data\\a 目录失败: {}", e))?;
    
    // 启动线程处理配置文件事件
    let app_handle1 = app.clone();
    let state_clone1 = state.inner().clone();
    std::thread::spawn(move || {
        for event in rx1 {
            handle_file_change(&app_handle1, &state_clone1, event);
        }
    });
    
    // 启动线程处理 data\a 目录事件
    let app_handle2 = app.clone();
    let state_clone2 = state.inner().clone();
    std::thread::spawn(move || {
        for event in rx2 {
            handle_file_change(&app_handle2, &state_clone2, event);
        }
    });
    
    // 存储监控器
    watchers_lock.insert(config_path_str, config_watcher);
    watchers_lock.insert(data_a_path_str, data_watcher);
    
    Ok(true)
}

// 获取当前设置的 osu 根目录
#[tauri::command]
pub fn get_osu_root_path_profile_watcher(state: State<'_, WatcherState>) -> String {
    state.get_osu_path()
}

// 手动触发同步
#[tauri::command]
pub fn trigger_sync_profile_watcher(
    app: AppHandle,
    state: State<'_, WatcherState>,
) -> Result<ProfileCopyResult, String> {
    let osu_path = state.get_osu_path();
    if osu_path.is_empty() {
        return Err("未设置 osu 根目录路径".to_string());
    }
    
    // 创建一个空的文件事件，仅用于触发同步
    let dummy_event = FileChangeEvent {
        path: osu_path.clone(),
        event_type: "manual".to_string(),
        username: String::new(),
        success: false,
        message: String::new(),
    };
    
    // 处理同步
    let result = process_file_change(&app, &state.inner(), &dummy_event);
    
    if result.success {
        Ok(result)
    } else {
        Err(result.message)
    }
}

// 从app_data目录还原配置文件到osu目录
#[tauri::command]
pub fn restore_profile_to_osu_dir(
    app: AppHandle,
    state: State<'_, WatcherState>,
    profile_id: String,
) -> Result<String, String> {
    // 获取osu根目录
    let osu_root = state.get_osu_path();
    if osu_root.is_empty() {
        return Err("未设置osu根目录路径".to_string());
    }

    // 获取应用数据目录
    let app_data_dir = match get_app_data_dir(&app) {
        Ok(dir) => dir,
        Err(e) => return Err(format!("获取应用数据目录失败: {}", e)),
    };

    // 解析profile_id获取用户名和服务器
    let parts: Vec<&str> = profile_id.split("____").collect();
    if parts.len() < 2 {
        return Err(format!("无效的profile_id格式: {}", profile_id));
    }

    let profile_name = parts[0];
    let server_endpoint = parts[1];
    
    // 确保我们使用的是文件系统上实际的文件夹名称（点号替换为下划线）
    let folder_name = generate_folder_name(profile_name, server_endpoint);
    let profile_dir = app_data_dir.join(&folder_name);

    // 确保配置文件夹存在
    if !profile_dir.exists() || !profile_dir.is_dir() {
        return Err(format!("配置文件夹不存在: {:?}", profile_dir));
    }

    // 构建目标路径
    let osu_root_path = Path::new(&osu_root);
    
    // 1. 复制配置文件
    let system_username = get_system_username();
    let config_filename = format!("osu!.{}.cfg", system_username);
    
    let source_config = profile_dir.join(&config_filename);
    let target_config = osu_root_path.join(&config_filename);
    
    if source_config.exists() {
        if let Err(e) = fs::copy(&source_config, &target_config) {
            return Err(format!("复制配置文件失败: {}", e));
        }
    } else {
        return Err(format!("源配置文件不存在: {:?}", source_config));
    }
    
    // 2. 复制data\a目录
    let source_data_a = profile_dir.join("a");
    let target_data_a = osu_root_path.join("data").join("a");
    
    // 确保目标目录存在
    if let Err(e) = fs::create_dir_all(osu_root_path.join("data")) {
        return Err(format!("创建data目录失败: {}", e));
    }
    
    // 如果目标目录已存在，先删除
    if target_data_a.exists() {
        if let Err(e) = fs::remove_dir_all(&target_data_a) {
            return Err(format!("删除目标data\\a目录失败: {}", e));
        }
    }
    
    // 复制目录
    if source_data_a.exists() {
        if let Err(e) = copy_path_recursive(&source_data_a, &target_data_a) {
            return Err(format!("复制data\\a目录失败: {}", e));
        }
    } else {
        // 如果数据目录不存在，创建一个空目录
        if let Err(e) = fs::create_dir_all(&target_data_a) {
            return Err(format!("创建空的data\\a目录失败: {}", e));
        }
    }
    
    Ok(format!("已成功还原账户 '{}' 的配置文件", profile_name))
}
