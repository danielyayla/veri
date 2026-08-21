// Native dialog helpers over tauri-plugin-dialog's callback API. The
// blocking_* variants deadlock on the main thread, so everything here is
// async and safe to call from any task.
use tauri::AppHandle;
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogKind};
use tokio::sync::oneshot;

/// Two-button question; resolves true for the primary button. The mapping
/// mirrors Electron's showMessageBox: `message` is the bold line, `detail`
/// the body.
pub async fn ask(app: &AppHandle, message: &str, detail: &str, primary: &str, secondary: &str) -> bool {
    let (tx, rx) = oneshot::channel();
    app.dialog()
        .message(detail)
        .title(message)
        .kind(MessageDialogKind::Info)
        .buttons(MessageDialogButtons::OkCancelCustom(primary.into(), secondary.into()))
        .show(move |primary_chosen| {
            let _ = tx.send(primary_chosen);
        });
    rx.await.unwrap_or(false)
}

pub async fn alert(app: &AppHandle, message: &str, detail: &str) {
    let (tx, rx) = oneshot::channel();
    app.dialog()
        .message(detail)
        .title(message)
        .kind(MessageDialogKind::Info)
        .show(move |_| {
            let _ = tx.send(());
        });
    let _ = rx.await;
}

/// Native folder picker; `can_create` adds the New Folder affordance the
/// new-project flow relies on (Electron's createDirectory property).
pub async fn pick_folder(app: &AppHandle, title: &str, can_create: bool) -> Option<String> {
    let (tx, rx) = oneshot::channel();
    app.dialog()
        .file()
        .set_title(title)
        .set_can_create_directories(can_create)
        .pick_folder(move |path| {
            let _ = tx.send(path);
        });
    rx.await
        .ok()
        .flatten()
        .and_then(|p| p.into_path().ok())
        .map(|p| p.to_string_lossy().into_owned())
}
