---
id: WO-071
type: work-order
title: "Spike: Tauri 2 feasibility as an Electron replacement for packages/ui"
status: backlog
created: 2026-08-20
updated: 2026-08-20
links:
  - id: DEC-008
    rel: informs
  - id: DEC-001
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

- [ ] Tauri app boots the existing renderer and displays the real project (snapshot served through the sidecar)
- [ ] Native folder picker opens a different Veri project and the app re-points to it
- [ ] A veri/ document round-trips: read, edit, save through core's saveDocumentFile guards, external-edit watcher event observed
- [ ] Native macOS menu bar present with standard roles plus Help → Report an Issue
- [ ] MCP status/setup and live verify-connection succeed against the real @veri/mcp server; installed agents detected
- [ ] Comparison report exists with measured (not estimated) bundle size, startup, memory, and code-delta numbers for both shells

## Receipts

- 2026-08-20 — c84613f — veri/sources/SRC-037-spike-report-tauri-2-feasibility-for-the-desktop-shell.md, veri/work-orders/WO-071-…md, veri/ids (spike code outside repo: scratchpad/veri-tauri-spike — sidecar.mjs, shim.js, src-tauri/) — Spike executed end to end: renderer booted in Tauri 2, all four capabilities green in the automated acceptance run (incl. live MCP handshake, 7 tools), measurements taken, SRC-037 report filed; WO left in backlog for Daniel's review.
