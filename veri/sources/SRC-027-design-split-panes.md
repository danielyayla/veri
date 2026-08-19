---
id: SRC-027
type: source
title: Design — Split panes
status: imported
created: 2026-08-19
updated: 2026-08-19
links:
  - id: REQ-016
    rel: designs
  - id: SRC-018
    rel: builds-on
  - id: SRC-004
    rel: builds-on
  - id: SRC-016
    rel: derived-from
  - id: DEC-012
    rel: constrained-by
  - id: REQ-020
    rel: constrained-by
---

> Drafted 2026-08-19 by an agent session (Claude Code) for the split
> panes work order, per the DEC-012 design gate, under Daniel's P2
> implementation directive. Pending Daniel's review. Written spec only.

[[SRC-016]] finding 4 lists "no split view" among the context
preservation gaps: reading a work order while its requirement is open
beside it is the trail-following act with the trail still visible.
One split, side by side — the Obsidian workflow without the Obsidian
workspace zoo.

## The model: two panes, each a full tab surface

- **At most two panes**, split vertically (side by side). No nested
  splits, no horizontal stacks — a second concept only if evidence
  demands it (manifesto 8).
- Each pane owns a complete `TabState` (tabs, active key, history) and
  renders its own tab strip above its own content — the existing
  `.editor-area` (strip + screen) duplicated, not re-plumbed. All tab
  mechanics from [[SRC-004]]/[[SRC-018]] apply per pane: preview tab,
  history, ⌘[/⌘], close/reorder.
- **One pane is focused**, shown by the existing active-tab treatment
  at full strength (the unfocused pane's strip dims, the same
  vocabulary as unfocused-window states). Mousedown anywhere in a
  pane focuses it. The focused pane's active entry drives everything
  single-valued: sidebar highlight, the crumb, `editView`, per-view
  transient state.
- **Routing**: sidebar rows, palette, and Connections cards open in
  the focused pane. ⌘-click still background-opens in the focused
  pane. A new explicit act — **⌘\ "Open beside"** (and an entry in
  the palette) — splits: it opens the focused pane's current entry in
  the second pane (creating it if absent) and focuses it. Closing a
  pane's last tab collapses the split; the survivor keeps its state.
- **View tabs stay app-global singletons**: a view open in one pane
  never opens in the other; the act focuses the pane that has it.
  This keeps every per-view transient single-homed. Documents may
  appear in both panes (the point of a split), but an *editor* is
  single-homed too — the CM6 island attaches to one pane; if the same
  document is open in both, the non-editing pane shows the reader.
- **Divider**: draggable, min 320px per side, double-click resets to
  50/50. Ratio is session state. Keyboard: the divider is focusable
  with arrow-key resize ([[REQ-020]]).

## Mechanics to respect (from the current shell)

`State.tabs/activeTabId/nextTabKey` become per-pane plus a focused-
pane id; `activationPatch` derives from the focused pane;
scroll-capture (`SCROLL_SEL`) scopes per pane container rather than
per root, since a split doubles every matching selector; `retainTabs`
runs over both panes on every snapshot. If tab persistence
([[SRC-026]]) has landed, the persisted shape grows a second optional
tab list and the split ratio; restore collapses to one pane when the
second list is empty.

## Everything unchanged

Tab visuals and anatomy, the sidebar and type panel (browsers, not
routes — they never split), the topbar, editor buffers keyed by doc
id with dirty-buffer prompts, palette behavior, tokens (the divider
uses existing border/hover tokens).
