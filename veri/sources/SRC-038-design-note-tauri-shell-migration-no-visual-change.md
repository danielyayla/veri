---
id: SRC-038
type: source
title: "Design note — Tauri shell migration: no visual change"
status: imported
created: 2026-08-21
updated: 2026-08-21
links:
  - id: WO-073
    rel: designs
  - id: SRC-037
    rel: follows-from
---

> Filed 2026-08-21 to satisfy the DEC-012 design gate for [[WO-073]],
> under Daniel's delegation of approvals for the Tauri migration.

The [[WO-073]] shell migration is intentionally invisible. This note
is the design document for a change whose design contract is
**pixel-identical absence of change**:

- The renderer ships byte-identical: same `app.bundle.js`, same
  stylesheets, same fonts, same DOM. No screen, control, token, or
  interaction changes. The design canon in `design/` continues to
  describe the app exactly as before.
- The `window.veri` surface presented to the renderer is preserved
  exactly (the [[SRC-037]] spike shim demonstrated the renderer
  cannot tell which shell hosts it).
- Native chrome must match what Electron provided today, as specified
  by existing canon: window size/min-size and background colors per
  [[WO-060]]'s first-paint rules; the standard macOS menu roles plus
  Help → "Report an Issue…" ([[WO-031]]); native folder pickers and
  message boxes in the same flows that show them today.
- Anything user-visible that would differ from the current app is a
  defect against [[WO-073]], not a design decision to make in flight.
