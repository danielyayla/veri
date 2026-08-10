---
id: SRC-004
type: source
title: Design handoff — Document tabs (IDE-style tab workflow)
status: imported
created: 2026-08-10
updated: 2026-08-10
links:
  - id: REQ-004
    rel: designs
  - id: WO-012
    rel: designs
---

High-fidelity design handoff for the editor-style tab strip that replaces
the desktop UI's single-view navigation, provided by the user and
implemented by [[WO-012]]. Files live in `design/document-tabs/`:

- `README.md` — self-sufficient written spec: 37px tab strip layout and
  exact tokens, tab anatomy (type-colored id chip / view glyph, ellipsized
  title, close ×), active/inactive/preview states, and the VS Code
  interaction semantics — links open pinned tabs after the active one,
  browsing reuses a single preview tab, ⌘-click background open,
  middle-click close, HTML5 drag reorder, views-as-tabs, empty state, and
  the `tabs`/`activeTabId`/`openTab`/`closeTab`/`pinTab`/`reorder` state
  model with a `previewTabs` settings flag.
- `Veri Tabs.dc.html` — self-running interactive prototype (open in a
  browser; `support.js` is its runtime). The embedded `Component` class is
  the reference implementation of the tab operations; the strip markup is
  the `{{ tabs }}` loop at the top of the editor area.

The spec's `REQ-002` default-doc fallback and its "Tauri webview" phrasing
are prototype-world details: the fallback maps to the project's first
document, and the target environment is the repo's actual Electron +
vanilla TypeScript renderer per [[DEC-008]].
