---
id: DEC-066
type: decision
title: "Screenshot harness captures via WKWebView takeSnapshot, not window imaging"
status: active
approved: 2026-08-21
created: 2026-08-21
updated: 2026-08-21
links:
  - id: WO-073
    rel: constrains
  - id: DEC-063
    rel: refines
---

## Choice

The VERI_UI_SHOT harness (render one named view headlessly, write a PNG, exit — with VERI_UI_VIEW / VERI_UI_DOC / VERI_UI_EVAL / VERI_UI_SHOT_DELAY_MS / VERI_UI_THEME preserved verbatim from the Electron contract) captures through WKWebView's takeSnapshotWithConfiguration, reached from Rust via tauri's with_webview and the objc2 bindings (src-tauri/src/shot.rs). Like Electron's capturePage it images the page content itself, so the window is created hidden (visible only outside shot mode, exactly Electron's `show: shotPath === undefined` posture), no pixel ever hits the screen, and no macOS permission is involved. VERI_UI_EVAL runs through WebviewWindow::eval, which bypasses the page CSP the same way webContents.executeJavaScript did.

## Rejected alternatives

- **`screencapture -l <windowNumber>`** (first implementation, measured failure) — requires the window on screen and the invoking context to hold the Screen Recording TCC permission; in automation without that grant it fails with "could not create image from window". A harness that needs a per-machine privacy grant is not headless.
- **CGWindowListCreateImage in-process** — same TCC gate as screencapture, plus a CoreGraphics binding for no gain.
- **Offscreen rendering / virtual display** — no Xvfb equivalent exists on macOS without kernel-adjacent display drivers; wildly out of proportion.
- **Dropping the harness and relying on the acceptance runner alone** — the eval harness proves behavior, not pixels; WO-060-style theme and layout regressions are exactly what a real capture catches.

## Rationale

takeSnapshot is the direct WKWebView analog of capturePage — same subject (the rendered page), same headlessness, same environment contract, so every existing VERI_UI_SHOT workflow ports unchanged. Verified both themes on the packaged app: 3120×1960 PNGs of the home view, light and dark, produced with the window hidden and no privacy prompts, including under a PATH stripped of any developer tooling.
