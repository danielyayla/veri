// The Veri desktop shell (WO-073, DEC-063): a thin Rust host owning what
// must be native — window, menus, dialogs, clipboard, updater, and the
// sidecar process. All Veri logic stays in the Node sidecar (DEC-001),
// reached through the single `veri_call` command; the renderer is the
// unchanged bundle behind renderer/shim.js (SRC-038).
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod dialogs;
mod launch;
mod menu;
mod shot;
mod sidecar;
mod theme;
mod updater;

use std::sync::Arc;

use serde_json::{json, Value};
use tauri::{Manager, RunEvent, State};

use sidecar::Sidecar;
use theme::ThemeState;
use updater::UpdateState;

/// The one bridge: every window.veri method that used to be an
/// ipcMain.handle travels through here to the sidecar.
#[tauri::command]
async fn veri_call(state: State<'_, Arc<Sidecar>>, method: String, params: Value) -> Result<Value, String> {
    state.call(&method, params).await
}

#[tauri::command]
async fn pick_folder(
    app: tauri::AppHandle,
    title: String,
    can_create: Option<bool>,
) -> Result<Option<String>, String> {
    Ok(dialogs::pick_folder(&app, &title, can_create.unwrap_or(false)).await)
}

#[tauri::command]
async fn pick_files(app: tauri::AppHandle, title: String) -> Result<Option<Vec<String>>, String> {
    Ok(dialogs::pick_files(&app, &title).await)
}

/// First snapshot rendered — the startup milestone the shim reports.
#[tauri::command]
fn booted(state: State<'_, Arc<Sidecar>>) {
    state.log("info", "renderer booted".into());
}

/// Theme preference changed (the sidecar already persisted it): re-pin the
/// WebView appearance and window background.
#[tauri::command]
fn apply_theme(app: tauri::AppHandle, pref: String) {
    theme::apply(&app, &pref);
}

/// Clipboard writes stay native (Electron's clipboard.writeText parity —
/// WKWebView's navigator.clipboard is permission-gated and flaky headless).
#[tauri::command]
fn copy_text(app: tauri::AppHandle, text: String) -> Result<(), String> {
    use tauri_plugin_clipboard_manager::ClipboardExt;
    app.clipboard().write_text(text).map_err(|e| e.to_string())
}

/// Settings → Updates facts, shell-side now that the updater is.
#[tauri::command]
fn update_status(state: State<'_, UpdateState>) -> Value {
    json!({
        "downloadedVersion": *state.downloaded_version.lock().unwrap(),
        "lastCheckAt": *state.last_check_at.lock().unwrap(),
    })
}

/// Acceptance harness gate (dev-only; see renderer/shim.js). Scratch project
/// paths ride in by environment so the run never touches a real project.
#[tauri::command]
fn accept_mode() -> Value {
    json!({
        "enabled": std::env::var("VERI_UI_ACCEPT").is_ok(),
        "main": std::env::var("VERI_ACCEPT_MAIN").ok(),
        "alt": std::env::var("VERI_ACCEPT_ALT").ok(),
        "doc": std::env::var("VERI_ACCEPT_DOC").ok(),
    })
}

#[tauri::command]
fn accept_report(app: tauri::AppHandle, state: State<'_, Arc<Sidecar>>, report: Value) {
    println!("ACCEPT-REPORT {report}");
    state.kill();
    app.exit(0);
}

fn main() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(ThemeState::default())
        .manage(UpdateState::default())
        .setup(|app| {
            menu::install(app)?;
            let sidecar = Sidecar::new(app.handle().clone());
            sidecar.spawn()?;
            app.manage(sidecar);
            // The launch chain needs dialogs, which deadlock on the main
            // thread — resolve root and build the window from a task.
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                launch::run(handle.clone()).await;
                updater::start(handle);
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            veri_call,
            pick_folder,
            pick_files,
            booted,
            apply_theme,
            copy_text,
            update_status,
            accept_mode,
            accept_report
        ])
        .on_window_event(|window, event| match event {
            // Electron's window-all-closed → quit; kill the sidecar with us.
            tauri::WindowEvent::Destroyed => {
                if let Some(sidecar) = window.app_handle().try_state::<Arc<Sidecar>>() {
                    sidecar.kill();
                }
            }
            tauri::WindowEvent::ThemeChanged(t) => {
                theme::on_os_flip(window.app_handle(), *t == tauri::Theme::Dark);
            }
            // OS file drags (WO-096, DEC-095): the webview's native handler
            // owns the gesture (HTML5 drops are suppressed on this platform),
            // so the shell forwards paths and the renderer draws the state.
            tauri::WindowEvent::DragDrop(drag) => {
                use tauri::Emitter;
                let paths_of = |paths: &Vec<std::path::PathBuf>| -> Vec<String> {
                    paths.iter().map(|p| p.to_string_lossy().into_owned()).collect()
                };
                match drag {
                    tauri::DragDropEvent::Enter { paths, .. } => {
                        let _ = window.emit("veri-drag-hover", paths_of(paths));
                    }
                    tauri::DragDropEvent::Drop { paths, .. } => {
                        let _ = window.emit("veri-drag-drop", paths_of(paths));
                    }
                    tauri::DragDropEvent::Leave => {
                        let _ = window.emit("veri-drag-cancel", ());
                    }
                    _ => {}
                }
            }
            _ => {}
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|app_handle, event| {
        if let RunEvent::Exit = event {
            if let Some(sidecar) = app_handle.try_state::<Arc<Sidecar>>() {
                sidecar.kill();
            }
        }
    });
}
