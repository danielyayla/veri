---
id: WO-073
type: work-order
title: "Migrate the desktop shell from Electron to Tauri 2 (Node sidecar, bundled runtime)"
status: in-progress
created: 2026-08-20
updated: 2026-08-21
links:
  - id: REQ-023
    rel: implements
  - id: SRC-037
    rel: informed-by
  - id: WO-071
    rel: follows-from
  - id: SRC-038
    rel: designed-by
  - id: DEC-063
    rel: constrained-by
---

## Summary

Implements REQ-023 by replacing packages/ui's Electron shell with the Tauri 2 architecture the WO-071 spike proved end to end (SRC-037): a thin Rust shell owning window, menus, dialogs, and the sidecar process; a Node sidecar hosting @veri/core, @veri/mcp, and ui's lib/ modules unmodified behind stdio JSON-RPC; the existing renderer bundle unchanged behind a window.veri shim. The app bundles its own Node runtime as a Tauri sidecar binary (~40 MB download, REQ-023's chosen posture — browsing must not require system Node), keeps the agent/MCP workflow on the same guarded core paths, and replaces electron-updater with tauri-plugin-updater on the existing GitHub Releases feed, including a bridge release so 0.1.x Electron installs land on the new line. Renderer, design canon, and all core/cli/mcp packages are untouched; the spike's ~800 lines of glue are the template, hardened to production (crash-restart, nativeTheme parity, message-box flows, screenshot-harness replacement).

## In scope

- packages/ui: Rust shell (src-tauri/) with window config, native menus incl. Help → Report an Issue, native dialogs and message-box flows, dock icon, theme parity (explicit pref and system tracking, first-paint correctness per WO-060)
- Node sidecar speaking the spike's stdio JSON-RPC: all veri:* handlers from main.ts, fs watchers → renderer events, sidecar lifecycle (spawn, kill on quit, crash restart with renderer notice)
- Bundled Node runtime as a signed Tauri sidecar binary; app runs with zero external runtime (REQ-023 criterion)
- window.veri shim preserving the exact preload.mts surface; renderer bundle byte-identical
- Updater migration: tauri-plugin-updater against GitHub Releases, minisign key handling documented, bridge release plan for existing electron-updater installs (WO-031/WO-034 parity: install-on-quit verified end to end)
- Signing/notarization pipeline (Developer ID + hardened runtime + notarytool) for the new bundle incl. sidecar
- Replacement for the VERI_UI_SHOT screenshot verification harness
- Release artifact sizes measured and stated (all under 50 MB)

## Out of scope

- Any renderer, core, cli, or mcp behavior change (the renderer must not be able to tell which shell it is in)
- Rewriting any TypeScript logic in Rust (DEC-001 stands)
- Windows/Linux builds
- Removing the Electron toolchain before the bridge release has shipped and been verified

## Requirements

- [[REQ-023]] — implements
- [[SRC-037]] — informed-by
- [[WO-071]] — follows-from
- [[DEC-008]] — superseded by [[DEC-063]] on approval (2026-08-21); the pending link is resolved and removed so the in-progress work order no longer stands on revoked authority

## Acceptance tests

- [ ] All WO-071 spike acceptance checks pass against the production shell (boot, folder picker + project switch, guarded doc round-trip + watcher event, native menus, MCP status/setup/live verify, agent detection/launch)
- [ ] App installed from the new artifact runs on a machine with no Node installed: opens a project, edits and saves a document
- [ ] macOS DMG per architecture measured under 50 MB and stated in release notes (REQ-023)
- [ ] An existing 0.1.x Electron install reaches the new version through the documented bridge path, and a subsequent tauri-updater update installs on quit
- [ ] Theme: explicit Light/Dark pref and System tracking behave as today, no wrong-palette first paint
- [ ] Screenshot verification harness produces a PNG of a named view headlessly
- [ ] veri check clean, existing ui unit tests green (renderer logic untouched)

## Receipts

(none yet)
