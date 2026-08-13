---
id: WO-012
type: work-order
title: Document tabs — IDE-style tab workflow in the desktop UI
status: done
created: 2026-08-10
updated: 2026-08-13
links:
  - id: REQ-004
    rel: extends
  - id: SRC-004
    rel: designed-by
  - id: DEC-008
    rel: constrained-by
  - id: DEC-012
    rel: constrained-by
  - id: WO-005
    rel: depends-on
---

## Summary

Add an editor-style tab strip to the desktop UI per the [[SRC-004]]
handoff. Opening a requirement, decision, work order, or source no longer
replaces the current view — each document opens in its own tab, and the
Board / Graph / Decisions / Agent connection views open as tabs too.
VS Code semantics: inline `[[ID]]` chips and Connections cards open new
pinned tabs after the active one; sidebar/board/graph/decision-log/check
browsing reuses a single preview tab (italic title, double-click to pin);
⌘-click opens in the background; middle-click closes; tabs drag to
reorder; closing every tab shows the NO OPEN TABS empty state. The
sidebar's active highlight tracks the active tab. Tabs were explicitly out
of scope for [[WO-005]]; this work order delivers them.

Per [[DEC-012]] this touches `packages/ui` and links its design document
`rel: designed-by` ([[SRC-004]]); the design was supplied and approved by
the user before implementation.

## In scope

- Pure tab-state operations (`openTab` / `closeTab` / `pinTab` /
  `reorder`) with colocated `node --test` coverage of the SRC-004 rules,
  including the `previewTabs: false` everything-pinned mode.
- Renderer: 37px tab strip between the top bar and the active view,
  spanning only the editor area; tab visuals, tooltips, and the empty
  state exactly per SRC-004 tokens.
- Rewiring every doc-open path to the design's pinned-vs-preview mapping,
  and view navigation (sidebar nav + agent-connection footer) to view
  tabs. "Documents" focuses the most recent document tab, else opens the
  project's first document as preview.
- ⌃Tab / ⌃⇧Tab cycling; per-tab scroll position preserved across tab
  switches (README "State Management" expectation).
- Boot: first document opens as a preview tab; the screenshot harness's
  `?view=` / `?doc=` params keep working by opening pinned tabs.

## Out of scope

- Persisting open tabs across restarts (README lists it as recommended,
  not in the prototype — follow-up work order).
- ⌘W close-tab: the default Electron menu owns ⌘W (Close Window);
  remapping requires an application menu, a separate change.
- A settings UI for the `previewTabs` flag (the flag exists in state with
  its default; no surface to toggle it is designed).
- Any change to `packages/core`, `packages/cli`, or the MCP server.

## Requirements

Extends [[REQ-004]] — the desktop app.

## Acceptance tests

- [x] Clicking an inline `[[ID]]` chip or a Connections card opens a
      pinned tab immediately after the active tab and focuses it; the
      source tab stays open; re-clicking focuses the existing tab
      instead of duplicating (pinning it if it was the preview).
- [x] Sidebar tree, board cards, graph "Open doc", decision-log entries,
      and veri-check issues share one italic preview tab that is reused
      in place; double-click pins it.
- [x] ⌘/Ctrl-click opens a doc's tab without focusing it.
- [x] × or middle-click closes a tab; closing the active tab activates
      the right neighbor, else the left; closing the last tab shows the
      NO OPEN TABS empty state.
- [x] Tabs reorder live via drag; Board / Graph / Decisions / Agent
      connection open as tabs from the sidebar; the sidebar highlight
      follows the active tab.
- [x] Tab-operation unit tests pass; `npm test` green.
- [x] `veri check` reports zero issues.

## Receipts

- 2026-08-10 · 4619ac9 · packages/ui/src/renderer/{tabs.ts,tabs.test.ts,
  app.ts,dom.ts,widgets.ts,views/reader.ts,views/board.ts,views/graph.ts,
  views/decisions.ts}, packages/ui/renderer/styles.css,
  design/document-tabs/, veri/sources/SRC-004 · Tab strip and VS Code
  open/preview/close/reorder semantics per SRC-004; 15 tab-op unit tests
  (54 total UI tests pass), veri check clean; pinned-link, preview-reuse,
  view-tab, and empty states verified against the prototype via the
  screenshot harness (agent session, Claude Code).
