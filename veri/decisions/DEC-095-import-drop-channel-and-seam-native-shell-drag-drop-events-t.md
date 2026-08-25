---
id: DEC-095
type: decision
title: "Import drop channel and seam — native shell drag-drop events, two-phase inspect/commit over the sidecar"
status: active
approved: 2026-08-25
created: 2026-08-25
updated: 2026-08-25
links:
  - id: WO-096
    rel: constrains
  - id: DEC-063
    rel: follows-from
  - id: DEC-093
    rel: follows-from
  - id: DEC-094
    rel: follows-from
  - id: SRC-045
    rel: implements
---

## Choice

OS file drags reach the renderer as shell-forwarded events: the Rust host consumes Tauri's native DragDrop window events (Enter/Drop/Leave) and emits veri-drag-hover/-drop/-cancel with the dragged paths; the renderer only draws state. The sidecar seam is two-phase: import-inspect reads and derives every row (extraction, refusal, title, size) writing nothing — so Cancel is free and refusals render as sheet rows — and import-commit files the accepted rows through core's intake module in the CLI adapter's write order, allocating ids at write time; the sheet's id chips are explicitly provisional (display from the corpus high-water, never recorded). The Sources-panel picker path adds a pick_files shell command (tauri_plugin_dialog, no extension filter — unsupported picks surface as refused rows, same honesty as the drag path).

## Rejected alternatives

- **HTML5 DOM drop events in the renderer** — the webview's native drag-drop handler suppresses page-level drop events on macOS/Windows, and DOM drops never carry filesystem paths; disabling the native handler to get them would trade real paths for none.
- **Single-phase import-on-drop** — files the instant the drop lands, contradicting the review-first design ([[SRC-045]]): no editable titles, no visible refusals, and Cancel would mean deleting already-written documents.
- **Reserving ids at inspect time** — holds allocations across an open sheet; a second session filing meanwhile would collide or leak numbers. Display-only provisional ids cost one line of honesty ("allocation happens at commit") and nothing else.
- **Extension-filtered file picker** — hides unsupported files instead of refusing them; the sheet's refused rows are the product's honesty surface, and the picker should feed it, not pre-empt it.

## Rationale

Every capability lands on the seam that already owns it: the Rust shell owns the native gesture and dialogs (DEC-063's split), the sidecar owns file access, core owns every derivation (DEC-093, DEC-094), and the renderer stays a pure view. Inspect-without-writes is what makes the review sheet honest — what it shows is exactly what commit will do, and abandoning it provably does nothing.
