// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod profile_watcher;
mod launcher;

use base64::{engine::general_purpose, Engine as _};
use ini::Ini;
use serde_json::{json, Value};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use tauri_plugin_http::reqwest;
use whoami;
use winreg::enums::*;
use winreg::RegKey;
use profile_watcher::{WatcherState, get_osu_root_path_profile_watcher, trigger_sync_profile_watcher, set_osu_root_path_profile_watcher, restore_profile_to_osu_dir};
use launcher::launch_osu;

fn resolve_shortcut_powershell(shortcut_path: &Path) -> Result<PathBuf, String> {
    #[cfg(target_os = "windows")]
    {
        let path_str = shortcut_path.to_string_lossy();

        // PowerShell 命令解析快捷方式
        let output = Command::new("powershell")
            .args(&[
                "-Command",
                &format!(
                    "$shell = New-Object -ComObject WScript.Shell; $shortcut = $shell.CreateShortcut('{}'); $shortcut.TargetPath",
                    path_str
                )
            ])
            .output()
            .map_err(|e| format!("执行 PowerShell 命令失败: {}", e))?;

        if !output.status.success() {
            return Err(format!(
                "PowerShell 命令执行失败: {}",
                String::from_utf8_lossy(&output.stderr)
            ));
        }

        let target_path = String::from_utf8_lossy(&output.stdout).trim().to_string();

        if target_path.is_empty() {
            return Err("无法获取快捷方式目标路径".to_string());
        }

        Ok(PathBuf::from(target_path))
    }

    #[cfg(not(target_os = "windows"))]
    {
        Err("解析快捷方式功能仅支持 Windows 平台".to_string())
    }
}

// 验证目录是否是有效的 osu! 目录
fn is_valid_osu_dir(dir_path: &Path) -> bool {
    // 检查必要的数据库文件是否存在
    let required_files = ["osu!.db", "scores.db", "collection.db"];

    for file in required_files {
        let file_path = dir_path.join(file);
        if !file_path.exists() {
            return false;
        }
    }

    true
}

#[tauri::command]
fn get_valid_songs_path(songs_dir: String, osu_base_dir: String) -> Result<String, String> {
    // 创建路径对象
    let songs_path = Path::new(&songs_dir);

    // 判断是否为绝对路径
    if songs_path.is_absolute() {
        // 如果是绝对路径，检查是否存在
        if songs_path.exists() && songs_path.is_dir() {
            // 转换为字符串并返回
            return songs_path
                .to_str()
                .map(|s| s.to_string())
                .ok_or_else(|| "路径包含无效字符".to_string());
        } else {
            return Err(format!("绝对路径不存在或不是目录: {}", songs_dir));
        }
    } else {
        // 如果是相对路径，与 osu 根目录拼接
        let base_path = Path::new(&osu_base_dir);

        // 检查 osu 根目录是否存在
        if !base_path.exists() || !base_path.is_dir() {
            return Err(format!("osu 根目录不存在或不是目录: {}", osu_base_dir));
        }

        // 拼接路径
        let full_path = base_path.join(songs_path);

        // 检查拼接后的路径是否存在
        if full_path.exists() && full_path.is_dir() {
            // 转换为字符串并返回
            return full_path
                .to_str()
                .map(|s| s.to_string())
                .ok_or_else(|| "路径包含无效字符".to_string());
        } else {
            return Err(format!(
                "拼接后的路径不存在或不是目录: {}",
                full_path.display()
            ));
        }
    }
}

// 获取系统用户名
#[tauri::command]
fn get_system_username() -> Result<String, String> {
    Ok(whoami::username())
}

#[tauri::command]
fn read_osu_config(config_path: String) -> Result<Value, String> {
    if !Path::new(&config_path).exists() {
        return Err("配置文件不存在".to_string());
    }

    let conf = Ini::load_from_file(config_path).map_err(|e| format!("无法读取配置文件: {}", e))?;

    let section = conf.general_section();

    let mut config_json = json!({});

    for (key, value) in section {
        config_json[key] = json!(value);
    }

    Ok(config_json)
}

#[tauri::command]
async fn get_osu_path_from_desktop() -> Result<String, String> {
    let desktop_path = match dirs::desktop_dir() {
        Some(path) => path,
        None => return Err("无法获取桌面路径".to_string()),
    };

    let entries = match fs::read_dir(&desktop_path) {
        Ok(entries) => entries,
        Err(e) => return Err(format!("无法读取桌面路径: {}", e)),
    };

    for entry in entries {
        if let Ok(entry) = entry {
            let path = entry.path();

            if let Some(extension) = path.extension() {
                if extension.to_string_lossy().to_lowercase() == "lnk" {
                    let file_name = path
                        .file_name()
                        .unwrap_or_default()
                        .to_string_lossy()
                        .to_lowercase();

                    if file_name.contains("osu") {
                        // 使用 PowerShell 解析快捷方式
                        if let Ok(target_path) = resolve_shortcut_powershell(&path) {
                            // 检查目标是否为 osu!.exe
                            if target_path.file_name().map_or(false, |name| {
                                name.to_string_lossy().to_lowercase() == "osu!.exe"
                            }) {
                                // 获取目标文件所在目录
                                if let Some(osu_dir) = target_path.parent() {
                                    // 验证是否是 osu! 目录
                                    if is_valid_osu_dir(osu_dir) {
                                        return Ok(osu_dir.to_string_lossy().to_string());
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    Err("未在桌面找到 osu! 快捷方式".to_string())
}

#[tauri::command]
fn get_osu_path_from_registry() -> Result<String, String> {
    // 只在 Windows 平台执行
    #[cfg(target_os = "windows")]
    {
        // 打开注册表键
        let hkcr = RegKey::predef(HKEY_CLASSES_ROOT);
        let osu_key = match hkcr.open_subkey("osu\\DefaultIcon") {
            Ok(key) => key,
            Err(e) => return Err(format!("无法打开注册表键: {}", e)),
        };

        // 读取默认值
        let osu_path: String = match osu_key.get_value("") {
            Ok(value) => value,
            Err(e) => return Err(format!("无法读取注册表值: {}", e)),
        };

        // 解析路径
        let parts: Vec<&str> = osu_path.split('"').collect();
        if parts.len() < 2 {
            return Err("无效的路径格式".to_string());
        }

        let exe_path = parts[1];
        let mut path_buf = PathBuf::from(exe_path);

        // 移除最后一个组件 (osu!.exe)
        if path_buf.pop() {
            let dir_path = path_buf.to_string_lossy().to_string();
            return Ok(dir_path);
        }

        Err("无法解析 osu 目录".to_string())
    }

    // 非 Windows 平台返回错误
    #[cfg(not(target_os = "windows"))]
    {
        Err("此功能仅支持 Windows 平台".to_string())
    }
}

#[tauri::command]
async fn download_image_base64(url: String) -> Result<String, String> {
    // 下载图片
    let response = reqwest::get(&url).await.map_err(|e| e.to_string())?;

    // 先获取并克隆 MIME 类型
    let content_type = response
        .headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("image/jpeg")
        .to_string(); // 转为 String 以解除对 response 的借用

    // 然后获取字节内容
    let bytes = response.bytes().await.map_err(|e| e.to_string())?;

    // 转换为Base64
    let base64_data = general_purpose::STANDARD.encode(&bytes);
    let data_url = format!("data:{};base64,{}", content_type, base64_data);

    Ok(data_url)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // This should be called as early in the execution of the app as possible
    #[cfg(debug_assertions)] // only enable instrumentation in development builds
    let devtools = tauri_plugin_devtools::init();

    let mut builder = tauri::Builder::default()
        .manage(WatcherState::new())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_opener::init());

    #[cfg(debug_assertions)]
    {
        builder = builder.plugin(devtools);
    }

    builder
        .invoke_handler(tauri::generate_handler![
            download_image_base64,
            get_osu_path_from_registry,
            get_osu_path_from_desktop,
            read_osu_config,
            get_system_username,
            get_valid_songs_path,
            set_osu_root_path_profile_watcher,
            get_osu_root_path_profile_watcher,
            trigger_sync_profile_watcher,
            restore_profile_to_osu_dir,
            launch_osu
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
