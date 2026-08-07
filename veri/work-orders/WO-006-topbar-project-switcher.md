---
id: WO-006
type: work-order
title: Topbar project switcher
status: done
created: 2026-08-07
updated: 2026-08-07
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

## Out of scope

- Any other restyling or refactoring of the shell
- Multi-window or side-by-side multi-project views
- Project removal/reordering UI beyond MRU behavior

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

## Receipts
