---
id: WO-103
type: work-order
title: "Work Orders board tab: a Kanban over the four-status lifecycle"
status: in-progress
claimed_by: claude-6f8627ae
claimed_at: 2026-08-25
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

A ▤ Board view tab — a four-column board (backlog · ready · in-progress · done) per SRC-047, giving the WO-098 ready state its deferred UI surface — opened from a `▤ Board` row atop the Work Orders type panel (SRC-047 as revised 2026-08-25: the collection row stays a panel toggle like every other collection). DONE is windowed with an expander; cards are lean (id, title, recency / receipt SHA, check dot); no drag-and-drop.

## In scope

- A `board` view tab (ViewKey, VIEW_META `▤`, one instance, preview semantics) opened from the `▤ Board` row at the top of the Work Orders type panel; the collection row stays a panel toggle
- Four columns from the shipped enum; DONE windowed to the 5 most recently updated with a `▸ show all N done` expander
- Card anatomy per SRC-047: mono type-colored id, title, `updated Nd ago`; done cards show receipt SHA; filled amber dot on check issues
- Surface `ready` across the UI: `STATUS_COLORS` (info blue), `STATUS_SEGMENTS`, `LIVING['work-order']` — with `backlog → ready` excluded from the segmented control (stamp-only transition)
- Container-query fallback to a stacked list below ~640px pane width
- Accessibility per SRC-019: buttons with `.btn-reset`, labeled sections, focus-visible

## Out of scope

- Drag-and-drop or any status mutation from the board (WO-053's ruling stands)
- Changes to the type panel's subgroups or sidebar row anatomy (the panel gains only the one `▤ Board` row)
- Any new colors outside the token blocks

## Requirements

- [[SRC-047]] — designed-by
- [[DEC-012]] — constrained-by
- [[REQ-004]] — extends
- [[WO-098]] — follows-from

## Acceptance tests

- [ ] Clicking the Work Orders collection toggles its type panel like every other collection; the panel's top `▤ Board` row opens the ▤ Board tab and closes the panel
- [x] Board shows four columns with token status colors; `ready` renders info blue everywhere a status renders
- [x] DONE column shows at most 5 cards until expanded; expander toggles in place
- [x] The work-order detail's segmented control offers no path into `ready`; `veri approve` remains the only write path
- [x] Done cards show their latest receipt SHA; cards with check issues show the filled amber dot
- [ ] Board survives a 320px split pane via the stacked fallback
- [x] `veri check` green

## Receipts

- 2026-08-25 — 0ae6fef — packages/ui/src/renderer/{tabs,theme,sidebar,derive,app}.ts, packages/ui/src/renderer/views/{board,workorder}.ts, packages/ui/renderer/styles.css (+ tabs/derive/sidebar tests), veri/requirements/REQ-004-desktop-ui.md, veri/decisions/DEC-105 — claude-6f8627ae session: the board view tab, the ready lane across the UI, the stamp-gated segment; 330/330 UI tests, typecheck and bundle green. Two boxes await a visual pass in the running app (collection-click entry, 320px pane fallback) — the dev shell is left running for it.
- 2026-08-25 — 555dd1b — packages/ui/src/renderer/{app,tabs}.ts, packages/ui/renderer/styles.css, veri/{decisions/DEC-105, sources/SRC-047, requirements/REQ-004}, design/work-orders-board/README.md — claude-6f8627ae session: entry point revised per Daniel's design critique — the Work Orders row is a panel toggle again (uniform with the other collections); the panel gains a `▤ Board` row that opens the tab, renamed Work Orders → Board. 330/330 UI tests, typecheck, bundle, `veri check` green (0 issues). DEC-105's stamp predates the revision — re-stamp wanted; the visual-pass boxes still await Daniel.
