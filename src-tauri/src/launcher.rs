use std::path::Path;
use std::process::Command;
use tauri::AppHandle;

// 启动osu进程的函数
#[tauri::command]
pub fn launch_osu(
    _app: AppHandle,
    osu_root: String,
    devserver_url: String,
    osu_exe_name: String,
) -> Result<String, String> {
    let osu_path = Path::new(&osu_root);
    
    // 检查路径是否存在
    if !osu_path.exists() || !osu_path.is_dir() {
        return Err(format!("无效的osu根目录路径: {}", osu_root));
    }
    
    // 构建osu可执行文件的完整路径
    let exe_path = osu_path.join(&osu_exe_name);
    
    if !exe_path.exists() {
        return Err(format!("osu可执行文件不存在: {:?}", exe_path));
    }
    
    // 准备启动命令
    let mut cmd = Command::new(&exe_path);
    
    // 如果有devserver_url，添加--devserver参数
    if !devserver_url.is_empty() {
        cmd.arg("-devserver").arg(&devserver_url);
    }
    
    // 设置工作目录为osu根目录
    cmd.current_dir(&osu_path);
    
    // 启动进程
    println!("启动osu: {:?} 参数: {:?}", exe_path, cmd.get_args().collect::<Vec<_>>());
    
    match cmd.spawn() {
        Ok(_) => Ok(format!("已成功启动osu! {}", if !devserver_url.is_empty() { format!("(连接到服务器: {})", devserver_url) } else { String::new() })),
        Err(e) => Err(format!("启动osu!失败: {}", e)),
    }
} 