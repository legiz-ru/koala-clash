use once_cell::sync::Lazy;
use serde::Serialize;

#[derive(Serialize, Debug, Clone)]
pub struct SystemInfo {
    pub hwid: String,
    pub os_type: String,
    pub os_ver: String,
}

pub static SYSTEM_INFO: Lazy<SystemInfo> = Lazy::new(|| {
    let os_info = os_info::get();
    SystemInfo {
        hwid: machine_uid::get().unwrap_or_else(|_| "unknown_hwid".to_string()),
        os_type: os_info.os_type().to_string(),
        os_ver: os_info.version().to_string(),
    }
});

pub fn get_system_info() -> &'static SystemInfo {
    &SYSTEM_INFO
}
