---
id: REQ-016
type: requirement
title: Navigation history and visible working context
status: accepted
approved: 2026-08-18
created: 2026-08-18
updated: 2026-08-18
links:
  - id: SRC-016
    rel: informed-by
  - id: REQ-004
    rel: extends
---

Veri's knowledge is relational, and its core reading act is following a
trail — WO → REQ → DEC → SRC — yet the app gives that trail no memory.
There is no back/forward, the breadcrumb is decorative, and the recents
list is tracked and persisted but rendered nowhere (it only feeds the
palette's recency boost). [[SRC-016]] scored context preservation 2/5,
the lowest UX axis: the train of thought is the casualty.

This requirement closes that gap. Traversal must be reversible, and the
user's working set — pinned, recent, open — must be visible, not merely
stored.

## Acceptance criteria

- [ ] Every tab has back/forward history covering link-chip clicks,
      Connections-card opens, palette opens, and ⌘-clicks in the editor;
      ⌘[ and ⌘] (or equivalent) walk it.
- [ ] Going back restores the prior document *and* its scroll position.
- [ ] The already-persisted recents render somewhere reachable without
      the palette (e.g. a working-context group in the sidebar or type
      panel), capped and newest-first.
- [ ] The type crumb in `Requirements / REQ-008` is live: clicking it
      opens that type's panel.
- [ ] History is workspace state, never written into `veri/` (DEC-014
      boundary holds).
