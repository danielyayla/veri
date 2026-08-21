// Theme parity with Electron's nativeTheme (WO-060): the sidecar persists
// the preference; the shell resolves it against the OS and keeps three
// things in step — the WebView's appearance (which drives the renderer's
// media query), the window background (so resize overdraw never flashes the
// wrong palette), and the first paint (background color + ?theme=light on
// the window URL, both set before the window exists).
use std::process::Command;
use std::sync::Mutex;

use tauri::window::Color;
use tauri::{AppHandle, Manager, Theme};

/// The current preference, mirrored from the sidecar so window events
/// (OS appearance flips) can re-derive the background color synchronously.
pub struct ThemeState(pub Mutex<String>);

impl Default for ThemeState {
    fn default() -> Self {
        Self(Mutex::new("system".into()))
    }
}

/// What Electron's nativeTheme.shouldUseDarkColors answered for
/// themeSource=system: the OS-level appearance.
pub fn system_dark() -> bool {
    Command::new("defaults")
        .args(["read", "-g", "AppleInterfaceStyle"])
        .output()
        .map(|o| String::from_utf8_lossy(&o.stdout).trim() == "Dark")
        .unwrap_or(false)
}

pub fn resolved_dark(pref: &str) -> bool {
    match pref {
        "dark" => true,
        "light" => false,
        _ => system_dark(),
    }
}

/// The two --bg values; keep in step with styles.css (WO-060). CSS vars
/// can't reach window chrome, so these two literals live here.
pub fn background(dark: bool) -> Color {
    if dark {
        Color(0x0F, 0x0F, 0x11, 0xFF)
    } else {
        Color(0xF2, 0xF1, 0xED, 0xFF)
    }
}

/// nativeTheme.themeSource: an explicit pref pins the WebView's appearance,
/// System lets it follow the OS.
pub fn webview_theme(pref: &str) -> Option<Theme> {
    match pref {
        "dark" => Some(Theme::Dark),
        "light" => Some(Theme::Light),
        _ => None,
    }
}

/// Re-pin the live window after a preference change (the shim calls this
/// right after the sidecar persists the pref).
pub fn apply(app: &AppHandle, pref: &str) {
    *app.state::<ThemeState>().0.lock().unwrap() = pref.to_string();
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.set_theme(webview_theme(pref));
        let _ = win.set_background_color(Some(background(resolved_dark(pref))));
    }
}

/// OS appearance flipped (WindowEvent::ThemeChanged): under System the
/// background must follow; an explicit pref already pinned everything.
pub fn on_os_flip(app: &AppHandle, dark: bool) {
    let pref = app.state::<ThemeState>().0.lock().unwrap().clone();
    if pref == "system" {
        if let Some(win) = app.get_webview_window("main") {
            let _ = win.set_background_color(Some(background(dark)));
        }
    }
}
