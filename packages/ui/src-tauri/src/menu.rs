// Application menu: the standard macOS roles Electron's role-based template
// provided, plus the WO-031 Help item. "Report an Issue…" opens the browser
// on a prefilled GitHub issue form — app and macOS version ride along as
// query params (built in TypeScript: lib/report.ts via the sidecar), so a
// report from the app arrives diagnosable without the user copying versions
// by hand.
use std::sync::Arc;

use serde_json::{json, Value};
use tauri::menu::{AboutMetadata, Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::Manager;
use tauri_plugin_opener::OpenerExt;

use crate::sidecar::Sidecar;

pub fn install(app: &tauri::App) -> tauri::Result<()> {
    let handle = app.handle();
    let app_menu = Submenu::with_items(
        handle,
        "Veri",
        true,
        &[
            &PredefinedMenuItem::about(handle, None, Some(AboutMetadata::default()))?,
            &PredefinedMenuItem::separator(handle)?,
            &PredefinedMenuItem::services(handle, None)?,
            &PredefinedMenuItem::separator(handle)?,
            &PredefinedMenuItem::hide(handle, None)?,
            &PredefinedMenuItem::hide_others(handle, None)?,
            &PredefinedMenuItem::show_all(handle, None)?,
            &PredefinedMenuItem::separator(handle)?,
            &PredefinedMenuItem::quit(handle, None)?,
        ],
    )?;
    let file_menu = Submenu::with_items(
        handle,
        "File",
        true,
        &[&PredefinedMenuItem::close_window(handle, None)?],
    )?;
    let edit_menu = Submenu::with_items(
        handle,
        "Edit",
        true,
        &[
            &PredefinedMenuItem::undo(handle, None)?,
            &PredefinedMenuItem::redo(handle, None)?,
            &PredefinedMenuItem::separator(handle)?,
            &PredefinedMenuItem::cut(handle, None)?,
            &PredefinedMenuItem::copy(handle, None)?,
            &PredefinedMenuItem::paste(handle, None)?,
            &PredefinedMenuItem::select_all(handle, None)?,
        ],
    )?;
    let view_menu = Submenu::with_items(
        handle,
        "View",
        true,
        &[&PredefinedMenuItem::fullscreen(handle, None)?],
    )?;
    let window_menu = Submenu::with_items(
        handle,
        "Window",
        true,
        &[
            &PredefinedMenuItem::minimize(handle, None)?,
            &PredefinedMenuItem::maximize(handle, None)?,
            &PredefinedMenuItem::separator(handle)?,
            &PredefinedMenuItem::close_window(handle, None)?,
        ],
    )?;
    let report_issue = MenuItem::with_id(handle, "report-issue", "Report an Issue…", true, None::<&str>)?;
    let help_menu = Submenu::with_items(handle, "Help", true, &[&report_issue])?;

    let menu = Menu::with_items(
        handle,
        &[&app_menu, &file_menu, &edit_menu, &view_menu, &window_menu, &help_menu],
    )?;
    app.set_menu(menu)?;
    app.on_menu_event(|app, event| {
        if event.id() == "report-issue" {
            let app = app.clone();
            tauri::async_runtime::spawn(async move {
                let sidecar = app.state::<Arc<Sidecar>>();
                if let Ok(Value::String(url)) = sidecar.call("issue-url", json!([])).await {
                    let _ = app.opener().open_url(url, None::<&str>);
                }
            });
        }
    });
    Ok(())
}
