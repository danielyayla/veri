// The launch chain (DEC-027, ported from main.ts's whenReady): resolve a
// project root through the sidecar, run the REQ-015 format-mismatch dialog
// loop natively, then build the one window with everything its first paint
// needs already decided — theme background, ?theme=light, welcome mode, and
// the screenshot harness's view/doc parameters.
use std::sync::Arc;

use serde_json::{json, Value};
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

use crate::dialogs;
use crate::sidecar::Sidecar;
use crate::theme;

struct Classified {
    operable: bool,
    statement: String,
}

fn classified(value: &Value) -> Classified {
    Classified {
        operable: value.get("operable").and_then(Value::as_bool) == Some(true),
        statement: value
            .get("statement")
            .and_then(Value::as_str)
            .unwrap_or("format mismatch")
            .to_string(),
    }
}

/// The picker half of the DEC-027 chain, MRU deliberately skipped: loop
/// until a directory that holds veri/ is picked, or the user gives up.
async fn pick_project_dir(app: &AppHandle, sidecar: &Arc<Sidecar>) -> Option<String> {
    loop {
        let dir = dialogs::pick_folder(app, "Open a Veri project", false).await?;
        let cls = sidecar.call("classify-dir", json!([dir])).await.ok()?;
        if cls.get("project").and_then(Value::as_bool) == Some(true) {
            return Some(dir);
        }
        let again = dialogs::ask(
            app,
            "Not a Veri project",
            &format!("No veri/ knowledge base inside {dir}."),
            "Choose Again",
            "Quit",
        )
        .await;
        if !again {
            return None;
        }
    }
}

pub async fn run(app: AppHandle) {
    let sidecar = app.state::<Arc<Sidecar>>().inner().clone();

    // First question: explicit arg / cwd walk-up, else the MRU head.
    let resolution = sidecar.call("launch-resolve", json!([])).await.unwrap_or(Value::Null);
    let mut root = resolution
        .get("root")
        .and_then(Value::as_str)
        .map(str::to_string);
    let mut cls = classified(&resolution);

    // REQ-015: a newer or unreadable format is stated, never opened. Straight
    // to the picker afterwards — the MRU may hold the very project just
    // refused. Every give-up lands on the welcome screen (SRC-013), exactly
    // like Electron's chain.
    while let Some(current) = root.clone() {
        if cls.operable {
            break;
        }
        let _ = current;
        let choose = dialogs::ask(
            &app,
            "Cannot open this project",
            &cls.statement,
            "Choose Another Project",
            "Quit",
        )
        .await;
        root = if choose { pick_project_dir(&app, &sidecar).await } else { None };
        if let Some(dir) = &root {
            let value = sidecar.call("classify-dir", json!([dir])).await.unwrap_or(Value::Null);
            cls = classified(&value);
        }
    }

    let mut welcome = root.is_none();
    if let Some(dir) = &root {
        // point-at re-validates, arms the watchers, logs, updates the MRU.
        match sidecar.call("point-at", json!([dir])).await {
            Ok(Value::Null) => {}
            Ok(Value::String(err)) => {
                dialogs::alert(&app, "Cannot open this project", &err).await;
                welcome = true;
            }
            _ => welcome = true,
        }
    }

    // First-paint theme: resolved before the window exists so the background
    // and the renderer's first frame agree (WO-060). The sidecar already
    // honored a VERI_UI_THEME override.
    let pref = sidecar
        .call("theme-get", json!([]))
        .await
        .ok()
        .and_then(|v| v.get("pref").and_then(Value::as_str).map(str::to_string))
        .unwrap_or_else(|| "system".into());
    let dark = theme::resolved_dark(&pref);
    *app.state::<theme::ThemeState>().0.lock().unwrap() = pref.clone();

    let mut query: Vec<String> = Vec::new();
    if !dark {
        query.push("theme=light".into());
    }
    if welcome {
        query.push("welcome=1".into());
    }
    // Screenshot harness (WO-073's VERI_UI_SHOT successor keeps the same
    // contract): render one named view, optionally one document.
    for (env, key) in [("VERI_UI_VIEW", "view"), ("VERI_UI_DOC", "doc")] {
        if let Ok(value) = std::env::var(env) {
            query.push(format!("{key}={value}"));
        }
    }
    let url = if query.is_empty() {
        "index.html".to_string()
    } else {
        format!("index.html?{}", query.join("&"))
    };

    // Shot mode renders and captures without ever showing the window, the
    // same posture Electron's harness had (show: shotPath === undefined).
    let shot = std::env::var("VERI_UI_SHOT").ok();
    let window = WebviewWindowBuilder::new(&app, "main", WebviewUrl::App(url.into()))
        .title("Veri")
        .inner_size(1560.0, 980.0)
        .min_inner_size(1080.0, 640.0)
        .background_color(theme::background(dark))
        .theme(theme::webview_theme(&pref))
        .visible(shot.is_none())
        .build();
    if window.is_err() {
        eprintln!("[shell] window creation failed");
        app.exit(1);
    }

    if let Some(shot_path) = shot {
        crate::shot::run(app.clone(), shot_path);
    }
}
