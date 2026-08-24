---
id: WO-071
type: work-order
title: "Spike: Tauri 2 feasibility as an Electron replacement for packages/ui"
status: done
created: 2026-08-20
updated: 2026-08-24
links:
  - id: DEC-008
    rel: informs
  - id: DEC-001
    rel: informs
  - id: SRC-038
    rel: designed-by
  - id: REQ-023
    rel: informs
---

## Summary

A time-boxed feasibility spike, not a migration: boot the existing packages/ui renderer unmodified inside a Tauri 2 shell and reproduce four representative native capabilities — open project directory (native folder picker), read/write a Veri document through @veri/core's guarded save path, native macOS menu/window behavior, and the agent/MCP connection workflow (status, setup, live verify). The spike's architecture is the one DEC-008 named as Tauri's cost: a Node sidecar process hosting @veri/core/@veri/mcp behind stdio JSON-RPC, proxied by a thin Rust shell. Deliverable is a comparison report (bundle size, startup time, memory, code delta, complexity, platform behavior, signing/updating) filed as a source document, giving DEC-008 a measured basis for staying or being superseded. All spike code lives outside the repo; no shipped code changes.

## In scope

- Tauri 2 shell (Rust) that loads the already-built dist/renderer bundle verbatim, with a window.veri shim replacing preload.mts
- Node sidecar speaking line-delimited JSON-RPC over stdio, reusing @veri/core, @veri/mcp, and packages/ui/dist/lib modules unmodified
- The four representative capabilities: folder picker + project switch, readDoc/saveDoc, native menus/window chrome, MCP status/setup/verify + agent detection
- File-watcher change events forwarded sidecar → Rust → renderer (needed for REQ-005 files-are-truth behavior)
- Measurements against the packaged Electron 0.1.2 build: bundle size, cold-start time, resident memory, lines of new/changed code
- Written findings on signing/notarization and auto-update paths under Tauri
- A source document in veri/ capturing the report

## Out of scope

- Any change to packages/* or shipped code
- A production-quality migration, CI, or cross-platform (Windows/Linux) builds
- Rewriting any @veri/core logic in Rust
- Superseding DEC-008 (the report informs that decision; it does not make it)

## Requirements

- [[DEC-008]] — informs
- [[DEC-001]] — informs

## Acceptance tests

- [x] Tauri app boots the existing renderer and displays the real project (snapshot served through the sidecar) — [[SRC-037]] "What was built": the Electron-built renderer bundle, byte-for-byte, booted in the Tauri 2 shell against this repo's real knowledge base via the Node sidecar (receipt c84613f, automated acceptance run 2026-08-20)
- [x] Native folder picker opens a different Veri project and the app re-points to it — [[SRC-037]] capability 1: native NSOpenPanel via tauri-plugin-dialog; re-point validated in core, MRU updated, watchers re-armed; switched to a 17-doc scaffolded demo project and back
- [x] A veri/ document round-trips: read, edit, save through core's saveDocumentFile guards, external-edit watcher event observed — [[SRC-037]] capability 2: edit persisted, `updated:` bumped, fs-watcher `veri:changed` event reached the renderer through the sidecar → Rust → WebView pipeline
- [x] Native macOS menu bar present with standard roles plus Help → Report an Issue — [[SRC-037]] capability 3: real macOS menu bar from Tauri's menu API with predefined role items plus Help → "Report an Issue…", screenshot-verified
- [x] MCP status/setup and live verify-connection succeed against the real @veri/mcp server; installed agents detected — [[SRC-037]] capability 4: mcp-status, agent detection (found Claude Code), verify-connection spawned the real @veri/mcp server — handshake ok, 7 tools, searchProved=true
- [x] Comparison report exists with measured (not estimated) bundle size, startup, memory, and code-delta numbers for both shells — [[SRC-037]] "Numbers (measured)": 6.8 MB vs 276 MB .app, 3.0 MB vs 194 MB installer, 0.69 s vs 1.34 s warm start, RSS ≈269 MB vs 270 MB, 795 lines of glue vs 700 replaced; real runs on this machine, not estimates

## Receipts

- 2026-08-20 — c84613f — veri/sources/SRC-037-spike-report-tauri-2-feasibility-for-the-desktop-shell.md, veri/work-orders/WO-071-…md, veri/ids (spike code outside repo: scratchpad/veri-tauri-spike — sidecar.mjs, shim.js, src-tauri/) — Spike executed end to end: renderer booted in Tauri 2, all four capabilities green in the automated acceptance run (incl. live MCP handshake, 7 tools), measurements taken, SRC-037 report filed; WO left in backlog for Daniel's review.
- 2026-08-24 — 8b42738 — veri/work-orders/WO-071-spike-tauri-2-feasibility-as-an-electron-replacement-for-pac.md — Closure: acceptance boxes checked against the evidence already in the repo ([[SRC-037]]'s measured report and the c84613f acceptance run) and status set done. The spike's question — is Tauri 2 a feasible Electron replacement? — was answered yes by the spike itself and then by reality: Daniel approved [[DEC-063]] (Tauri 2 shell with Node sidecar, superseding DEC-008) and [[WO-073]] shipped the migration; the app on main is Tauri 2. [[SRC-038]] linked designed-by to satisfy the DEC-012 gate (the spike itself changed no shipped code), and [[REQ-023]] linked rel informs — the spike's report framed that requirement's 50 MB ceiling. No new work performed.
