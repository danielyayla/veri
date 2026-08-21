// Screenshot verification harness (WO-073): the VERI_UI_SHOT contract from
// the Electron main process — render one view headlessly, write a PNG,
// quit. capturePage's closest WKWebView analog is takeSnapshot, which images
// the page itself: no window on screen, no screen-recording permission, the
// window stays hidden exactly as Electron's shot mode kept it.
//
//   VERI_UI_SHOT=/path.png [VERI_UI_VIEW=homeview] [VERI_UI_DOC=WO-005]
//   [VERI_UI_EVAL=js] [VERI_UI_SHOT_DELAY_MS=1200] [VERI_UI_THEME=light]
use std::time::Duration;

use tauri::{AppHandle, Manager};

pub fn run(app: AppHandle, shot_path: String) {
    tauri::async_runtime::spawn(async move {
        let Some(window) = app.get_webview_window("main") else {
            eprintln!("[shot] no main window");
            app.exit(1);
            return;
        };
        // Give fonts and layout a beat to settle before capturing.
        // VERI_UI_EVAL (renderer JS) and VERI_UI_SHOT_DELAY_MS let automated
        // checks poke state (e.g. open the autocomplete) or wait out an
        // external file edit first. eval() bypasses the page CSP the same way
        // Electron's executeJavaScript did.
        if let Ok(js) = std::env::var("VERI_UI_EVAL") {
            tokio::time::sleep(Duration::from_millis(600)).await;
            let _ = window.eval(&js);
        }
        let delay = std::env::var("VERI_UI_SHOT_DELAY_MS")
            .ok()
            .and_then(|v| v.parse::<u64>().ok())
            .unwrap_or(1200);
        tokio::time::sleep(Duration::from_millis(delay)).await;
        capture(&app, &window, shot_path);
    });
}

#[cfg(target_os = "macos")]
fn capture(app: &AppHandle, window: &tauri::WebviewWindow, shot_path: String) {
    use block2::RcBlock;
    use objc2_app_kit::{NSBitmapImageFileType, NSBitmapImageRep, NSImage};
    use objc2_foundation::{NSDictionary, NSError};
    use objc2_web_kit::{WKSnapshotConfiguration, WKWebView};

    let app = app.clone();
    let app_after = app.clone();
    let result = window.with_webview(move |webview| {
        // with_webview runs its closure on the main thread.
        let mtm = unsafe { objc2_foundation::MainThreadMarker::new_unchecked() };
        let wk: &WKWebView = unsafe { &*webview.inner().cast() };
        let config = unsafe { WKSnapshotConfiguration::new(mtm) };
        let app_done = app.clone();
        let block = RcBlock::new(move |image: *mut NSImage, error: *mut NSError| {
            if image.is_null() {
                eprintln!("[shot] takeSnapshot failed: {:?}", unsafe { error.as_ref() });
                app_done.exit(1);
                return;
            }
            // NSImage → TIFF → NSBitmapImageRep → PNG bytes → file.
            let png: Option<Vec<u8>> = unsafe {
                let image = &*image;
                image
                    .TIFFRepresentation()
                    .and_then(|tiff| NSBitmapImageRep::imageRepWithData(&tiff))
                    .and_then(|rep| {
                        rep.representationUsingType_properties(NSBitmapImageFileType::PNG, &NSDictionary::new())
                            .map(|data| data.to_vec())
                    })
            };
            match png {
                Some(bytes) => match std::fs::write(&shot_path, bytes) {
                    Ok(()) => app_done.exit(0),
                    Err(err) => {
                        eprintln!("[shot] write failed: {err}");
                        app_done.exit(1);
                    }
                },
                None => {
                    eprintln!("[shot] PNG encoding failed");
                    app_done.exit(1);
                }
            }
        });
        unsafe { wk.takeSnapshotWithConfiguration_completionHandler(Some(&config), &block) };
    });
    if let Err(err) = result {
        eprintln!("[shot] with_webview failed: {err}");
        app_after.exit(1);
    }
}

#[cfg(not(target_os = "macos"))]
fn capture(app: &AppHandle, _window: &tauri::WebviewWindow, _shot_path: String) {
    eprintln!("[shot] unsupported platform");
    app.exit(1);
}
