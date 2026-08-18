---
id: WO-039
type: work-order
title: Tab history and a visible working set
status: backlog
created: 2026-08-18
updated: 2026-08-18
links:
  - id: REQ-016
    rel: implements
---

## Summary

Following a trail — SRC → REQ → DEC → WO — is Veri's core reading act,
and today it is one-way: no back/forward, a decorative breadcrumb, and a
recents list that is persisted but rendered nowhere. Give every tab a
navigation history and surface the working set (recent documents, live
type crumb) so a train of thought can be retraced instead of rebuilt.

## In scope

- Per-tab back/forward history covering every navigation path: link-chip
  clicks, Connections-card opens, palette opens, and ⌘-clicks in the
  editor. ⌘[ / ⌘] (or the platform equivalent) walk it.
- Restoring scroll position along with the document when going back.
- Rendering the already-persisted recents outside the palette — a
  working-context group in the sidebar or type panel, capped and
  newest-first.
- Making the type crumb live: clicking `Requirements` in
  `Requirements / REQ-008` opens the Requirements panel.
- History kept as workspace state only — never written into `veri/`
  (the DEC-014 boundary holds).

## Out of scope

- Split views, link previews, or hover cards — context preservation
  beyond history is later work.
- Pinned documents (REQ-016 names pinning as part of the working set;
  it needs its own design pass and can follow separately).
- Any change to what the palette's recency boost does with the same data.

## Requirements

Implements [[REQ-016]] — traversal must be reversible and the working
set visible, not merely stored.

## Before starting

This is UI work: DEC-012 requires a design bundle and a `designed-by`
link before this order leaves backlog. [[SRC-004]] (tabs) and
[[SRC-014]] (sidebar) are the adjacent canon to extend.

## Acceptance tests

- [ ] From a fresh tab, opening four documents by four different paths
      (chip, Connections card, palette, ⌘-click) then pressing back four
      times returns through all of them in order, scroll restored.
- [ ] Forward re-walks the same trail; a new navigation from mid-history
      truncates the forward stack, browser-style.
- [ ] The recents group is visible without opening the palette, ordered
      newest-first, and capped.
- [ ] Clicking the type segment of the crumb opens that type's panel.
- [ ] Nothing under `veri/` changes when navigating; `veri check` stays
      clean and the UI test suite passes.

## Receipts

(none yet)
