---
id: WO-055
type: work-order
title: "Split panes"
status: backlog
created: 2026-08-19
updated: 2026-08-19
links:
  - id: REQ-016
    rel: implements
  - id: SRC-027
    rel: designed-by
  - id: SRC-016
    rel: derived-from
---

## Summary

One vertical split, per [[SRC-027]]: at most two side-by-side panes, each a full tab surface (own `TabState`, own strip, all [[SRC-018]] history mechanics), with one focused pane driving everything single-valued — sidebar highlight, crumb, `editView`, per-view transients. ⌘\ "Open beside" (plus a palette entry) opens the focused pane's current entry in the other pane; closing a pane's last tab collapses the split. View tabs stay app-global singletons (opening one focuses the pane that has it); documents may appear in both panes but an editor island is single-homed, the other pane showing the reader. Draggable divider with min widths, double-click reset, arrow-key resize ([[REQ-020]]). Reading a work order beside its requirement is [[SRC-016]] finding 4's trail, finally visible whole.

## In scope

- Per-pane `TabState` + focused-pane id in `State`; `activationPatch` derives from the focused pane; `retainTabs` runs over both panes per snapshot
- The second `.editor-area` (strip + screen) with unfocused-strip dimming; mousedown focuses a pane
- ⌘\ and the palette "Open beside" command; routing (sidebar/palette/cards open in the focused pane); collapse on last-tab close
- View-singleton-across-panes and single-homed-editor rules
- Divider: drag with 320px minimums, double-click 50/50, focusable with arrow-key resize; ratio as session state
- Per-pane scroll capture (scoping `SCROLL_SEL` per pane container) and focus restore
- If [[WO-054]] has landed: persist the second tab list + ratio additively, restore collapsing to one pane when absent

## Out of scope

- More than two panes, nested or horizontal splits
- Splitting the sidebar, type panel, or topbar (browsers and chrome, not panes)
- Two simultaneous editors on the same document
- New tokens (divider uses existing border/hover tokens)

## Requirements

- [[REQ-016]] — implements
- [[SRC-027]] — designed-by
- [[SRC-016]] — derived-from

## Acceptance tests

- [ ] ⌘\ opens the current entry beside; both panes navigate, keep independent history (⌘[/⌘] act on the focused pane), and show independent scroll positions
- [ ] Sidebar highlight, crumb, and edit mode follow the focused pane; clicking in the other pane moves all three
- [ ] A view open in pane A, when opened from pane B, focuses pane A's tab instead of duplicating; the same document open in both panes shows editor in one and reader in the other when editing
- [ ] Closing a pane's last tab collapses the split with the survivor's state intact; divider drag, double-click reset, and keyboard resize work with minimums enforced
- [ ] `veri check` stays at zero issues; full typecheck and test suite pass

## Receipts

(none yet)
