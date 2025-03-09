use std::fs;
use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerCredentials {
    pub username: String,
    pub plain_password: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerInfo {
    pub name: String,
    pub website_url: String,
    pub credential_url: String,
    pub devserver_url: String,
}

/// 修改osu配置文件中的服务器凭据
///
/// # Arguments
///
/// * `config_file` - osu配置文件路径
/// * `server` - 服务器信息
///
/// # Examples
///
/// ```
/// let server = ServerInfo {
///     domain: "ppy.sb".to_string(),
///     is_bancho: false,
///     credentials: ServerCredentials {
///         username: "player123".to_string(),
///         plain_password: "password123".to_string(),
///     },
/// };
/// set_server_credentials("path/to/osu.cfg", &server);
/// ```
pub fn set_server_credentials(config_file: &str, credentials: &ServerCredentials, server: &ServerInfo) -> Result<(), String> {
    // 读取配置文件
    let content = fs::read_to_string(config_file)
        .map_err(|e| format!("读取配置文件失败: {}", e))?;
    
    // 修改相关行
    let mut lines: Vec<String> = content.lines().map(|line| line.to_string()).collect();
    
    for i in 0..lines.len() {
        if lines[i].starts_with("Username =") {
            lines[i] = format!("Username = {}", credentials.username);
        } else if lines[i].starts_with("Password =") {
            lines[i] = format!("Password = {}", credentials.plain_password);
        } else if lines[i].starts_with("SaveUsername =") {
            lines[i] = "SaveUsername = 1".to_string();
        } else if lines[i].starts_with("SavePassword =") {
            lines[i] = "SavePassword = 1".to_string();
        } else if lines[i].starts_with("CredentialEndpoint =") {
            let endpoint = if server.name == "bancho" { "".to_string() } else { server.credential_url.clone() };
            lines[i] = format!("CredentialEndpoint = {}", endpoint);
        }
    }
    
    // 写回配置文件
    fs::write(config_file, lines.join("\n"))
        .map_err(|e| format!("写入配置文件失败: {}", e))?;
    
    Ok(())
}

/// Tauri命令包装器
#[tauri::command]
pub fn set_osu_server_credentials(config_file: &str, credentials: ServerCredentials, server: ServerInfo) -> Result<(), String> {
    set_server_credentials(config_file, &credentials, &server)
}
