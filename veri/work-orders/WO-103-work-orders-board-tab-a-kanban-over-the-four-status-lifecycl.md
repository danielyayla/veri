---
id: WO-103
type: work-order
title: "Work Orders board tab: a Kanban over the four-status lifecycle"
status: ready
approved: 2026-08-25
created: 2026-08-25
updated: 2026-08-25
links:
  - id: SRC-047
    rel: designed-by
  - id: DEC-012
    rel: constrained-by
  - id: REQ-004
    rel: extends
  - id: WO-098
    rel: follows-from
---

## Summary

Clicking the Work Orders collection opens a ▤ Work Orders view tab — a four-column board (backlog · ready · in-progress · done) per SRC-047, giving the WO-098 ready state its deferred UI surface. DONE is windowed with an expander; cards are lean (id, title, recency / receipt SHA, check dot); no drag-and-drop.

## In scope

- A `board` view tab (ViewKey, VIEW_META `▤`, one instance, preview semantics) opened by clicking the Work Orders collection row
- Four columns from the shipped enum; DONE windowed to the 5 most recently updated with a `▸ show all N done` expander
- Card anatomy per SRC-047: mono type-colored id, title, `updated Nd ago`; done cards show receipt SHA; filled amber dot on check issues
- Surface `ready` across the UI: `STATUS_COLORS` (info blue), `STATUS_SEGMENTS`, `LIVING['work-order']` — with `backlog → ready` excluded from the segmented control (stamp-only transition)
- Container-query fallback to a stacked list below ~640px pane width
- Accessibility per SRC-019: buttons with `.btn-reset`, labeled sections, focus-visible

## Out of scope

- Drag-and-drop or any status mutation from the board (WO-053's ruling stands)
- Changes to the type panel, its subgroups, or sidebar row anatomy
- Any new colors outside the token blocks

## Requirements

- [[SRC-047]] — designed-by
- [[DEC-012]] — constrained-by
- [[REQ-004]] — extends
- [[WO-098]] — follows-from

## Acceptance tests

- [ ] Clicking the Work Orders collection opens the ▤ Work Orders board tab; the type panel behavior for other collections is unchanged
- [ ] Board shows four columns with token status colors; `ready` renders info blue everywhere a status renders
- [ ] DONE column shows at most 5 cards until expanded; expander toggles in place
- [ ] The work-order detail's segmented control offers no path into `ready`; `veri approve` remains the only write path
- [ ] Done cards show their latest receipt SHA; cards with check issues show the filled amber dot
- [ ] Board survives a 320px split pane via the stacked fallback
- [ ] `veri check` green

## Receipts

(none yet)
