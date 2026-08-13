---
id: WO-006
type: work-order
title: Topbar project switcher
status: done
created: 2026-08-07
updated: 2026-08-13
links:
  - id: REQ-004
    rel: extends
  - id: DEC-008
    rel: constrained-by
  - id: DEC-010
    rel: constrained-by
  - id: WO-005
    rel: depends-on
---

## Summary

Replace the static project name in the topbar breadcrumb (`Veri /
<project>`) with a dropdown that switches between recently opened project
directories. Spec and design reference delivered as a delta package
(`delta_project_switcher/`: README.md + switcher-snippet.html) extracted
from the [[SRC-001]] design mockup line; the snippet is an HTML reference
to be recreated in the shell built by [[WO-005]].

## In scope

- Trigger button replacing the plain project-name span: mono 12px name +
  9px caret, 24px tall, hover/open bg per spec
- 300px popover anchored below the button: PROJECTS header, one row per
  known project (accent swatch, name, amber issue dot, ellipsized
  `<path> · N docs[ · N issues]` meta, green ✓ on the current row),
  hairline divider, "+ Open project folder…" footer with ⌘O kbd chip
- Open/close behavior: mutual exclusion with the veri-check popover,
  close on outside click and Esc; ⌘O opens the OS folder picker
- MRU list of project dirs persisted in app config ([[DEC-010]]);
  doc/issue counts derived live per project
- Switching re-points the app at the selected directory and reloads
  sidebar, docs, and health (including re-arming file watchers)
- Directories are validated (must contain `veri/`) before any state
  changes; an invalid pick or a stale MRU entry surfaces an error
  instead of silently breaking the running app

## Out of scope

- Any other restyling or refactoring of the shell
- Multi-window or side-by-side multi-project views
- Project removal/reordering UI beyond MRU behavior

## Requirements

Extends [[REQ-004]] — the desktop app shell this switcher lives in.

## Acceptance tests

- [x] Breadcrumb project name renders as the dropdown trigger; opening it
      lists known projects with swatch, meta line, and ✓ on the current one
- [x] Opening the switcher closes the veri-check popover and vice versa;
      outside click and Esc close it
- [x] "Open project folder…" (and ⌘O) opens the OS folder picker and adds
      the chosen directory to the MRU list
- [x] Selecting another project re-points the app: sidebar tree, docs, and
      health chip reload from that project's `veri/` files
- [x] MRU list survives app restart (persisted in app config)
- [x] Picking a directory without `veri/` (or clicking a stale MRU row)
      shows an error and leaves the running project fully intact —
      projectRoot, MRU, and watchers unchanged

## Receipts

- 2026-08-07 — c2457be — packages/ui/src/renderer/app.ts, packages/ui/src/renderer/api.ts, packages/ui/src/preload.mts, packages/ui/src/main.ts, packages/ui/renderer/styles.css, veri/decisions/DEC-010, veri/work-orders/WO-006 — claude-code agent session: built the topbar project switcher from the delta_project_switcher spec — trigger button, 300px popover with MRU rows and live doc/issue counts, ⌘O folder-picker action, MRU persisted per DEC-010; switch verified end-to-end via headless screenshots (veri → demo project: breadcrumb, sidebar, and health chip all reload), popover render and MRU persistence across restart verified likewise; the native folder-picker dialog itself is the one step not driven headlessly (same code path as switch). Fixed a mainWin-assignment race found during verification. 18 tests green, veri check clean.
- 2026-08-07 — ad1ee7b — packages/ui/src/main.ts, packages/ui/src/lib/root.ts + root.test.ts, packages/ui/src/renderer/app.ts, packages/ui/src/renderer/api.ts, packages/ui/renderer/styles.css, veri/work-orders/WO-006 — claude-code agent session: fixed the unvalidated-directory bug found while explaining the open-folder flow — pointAppAt() now requires veri/ before mutating projectRoot/MRU/watchers, and invalid picks or stale MRU rows surface an amber error popover instead of silently breaking the app; failure path verified by headless screenshot (bogus MRU row → error shown, running project intact), new isVeriProject test, all suites green, veri check clean.
