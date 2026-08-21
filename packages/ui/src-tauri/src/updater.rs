// Background auto-update per REQ-011, on tauri-plugin-updater instead of
// electron-updater (WO-073): check on launch and every few hours against the
// GitHub Releases feed (latest.json), download and stage silently, then
// ask — never force a restart. "Later" leaves the staged update to take
// effect at the next launch, the tauri equivalent of install-on-quit. Every
// failure path is invisible in the UI: an unreachable feed must behave
// exactly like being up to date, and the log is the only place a failed
// check is visible at all (DEC-034).
use std::collections::HashSet;
use std::sync::{Arc, Mutex};
use std::time::Duration;

use tauri::{AppHandle, Manager};
use tauri_plugin_updater::UpdaterExt;

use crate::dialogs;
use crate::sidecar::Sidecar;

const CHECK_INTERVAL: Duration = Duration::from_secs(4 * 60 * 60);
const FIRST_CHECK_DELAY: Duration = Duration::from_secs(10);

/// What the Settings → Updates section shows (WO-036), same shape the
/// Electron main process kept.
#[derive(Default)]
pub struct UpdateState {
    pub downloaded_version: Mutex<Option<String>>,
    pub last_check_at: Mutex<Option<u64>>,
    prompted: Mutex<HashSet<String>>,
}

fn now_ms() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

pub fn start(app: AppHandle) {
    if tauri::is_dev() {
        return;
    }
    tauri::async_runtime::spawn(async move {
        // Off the launch path: the window is up before the first check runs.
        tokio::time::sleep(FIRST_CHECK_DELAY).await;
        loop {
            check_once(&app).await;
            tokio::time::sleep(CHECK_INTERVAL).await;
        }
    });
}

async fn check_once(app: &AppHandle) {
    let sidecar = app.state::<Arc<Sidecar>>().inner().clone();
    let state = app.state::<UpdateState>();
    let updater = match app.updater() {
        Ok(updater) => updater,
        Err(err) => {
            sidecar.log("error", format!("updater: not available: {err}"));
            return;
        }
    };
    match updater.check().await {
        Ok(None) => {
            *state.last_check_at.lock().unwrap() = Some(now_ms());
        }
        Ok(Some(update)) => {
            *state.last_check_at.lock().unwrap() = Some(now_ms());
            let version = update.version.clone();
            let already = state.downloaded_version.lock().unwrap().as_deref() == Some(version.as_str());
            if !already {
                sidecar.log("info", format!("updater: downloading {version}"));
                match update.download_and_install(|_, _| {}, || {}).await {
                    Ok(()) => {
                        *state.downloaded_version.lock().unwrap() = Some(version.clone());
                        sidecar.log("info", format!("updater: {version} staged; takes effect at next launch"));
                    }
                    Err(err) => {
                        sidecar.log("error", format!("updater: download of {version} failed: {err}"));
                        return;
                    }
                }
            }
            // Interval re-checks see the same version again; ask once per
            // version per run.
            if !state.prompted.lock().unwrap().insert(version.clone()) {
                return;
            }
            let restart = dialogs::ask(
                app,
                &format!("Veri {version} is ready to install"),
                "The update was downloaded in the background. Restart now to use it, or keep working — it will be in place when you next open Veri.",
                "Restart Now",
                "Later",
            )
            .await;
            if restart {
                sidecar.log("info", "updater: restarting into the new version".into());
                app.restart();
            }
        }
        Err(err) => {
            // One greppable outcome line (REQ-011 keeps failures out of the
            // UI; the log is where they go).
            let first_line = err.to_string();
            let first_line = first_line.lines().next().unwrap_or("unknown error").to_string();
            sidecar.log("error", format!("update check failed: {first_line}"));
        }
    }
}
