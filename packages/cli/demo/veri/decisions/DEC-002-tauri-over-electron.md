---
id: DEC-002
type: decision
title: Tauri over Electron
status: active
created: 2026-07-18
updated: 2026-07-18
links:
  - id: WO-002
    rel: export-runs-in-core
---

## Choice

Ship the desktop app on Tauri; core logic in Rust, thin webview UI.

## Rejected alternatives

- **Electron** — heavier binary, and PDF rendering would sit behind a
  JS/native boundary.
- **Pure CLI only** — invoicing has too much visual review to skip a UI.

## Rationale

Rust core keeps the binary small and lets the Typst compiler link in
directly for [[WO-002]] — no sidecar process. Export runs in the core,
not the webview.
