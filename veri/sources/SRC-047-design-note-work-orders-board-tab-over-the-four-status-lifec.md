---
id: SRC-047
type: source
title: "Design note — Work Orders board tab over the four-status lifecycle"
status: imported
created: 2026-08-25
updated: 2026-08-25
links:
  - id: REQ-004
    rel: designs
  - id: SRC-025
    rel: follows-from
  - id: SRC-014
    rel: builds-on
  - id: DEC-012
    rel: constrained-by
---

> Drafted 2026-08-25 by an agent session (Claude Code) at Daniel's
> direction ("clicking Work Orders should open a tab containing a
> Kanban board"). Approved by Daniel 2026-08-25. This reopens the
> stamped [[SRC-025]] ruling that folded the board away — flagged per
> WF-001 rule 2 and now superseding it for the board's return as a
> view tab.

Full handoff: `design/work-orders-board/README.md` + `Veri Work Orders
Board.html` (dark + light). Published copy:
https://claude.ai/code/artifact/a3c6f783-68e8-42da-a860-df668fdfac5f

> **Revised 2026-08-25 after Daniel's design critique**: the collection
> row stays a panel toggle like every other collection; the board is
> reached from a `▤ Board` row atop the Work Orders type panel. The
> critique: a view-row Work Orders click broke the sidebar's one
> consistent rule (collections are browsers, view rows are routes) and
> cost the panel's search/discoverability. The pattern is now "list is
> the default surface, board is the alternate view" — the panel *is*
> the list. This resolves the open question below.

The Work Orders type panel gains a **`▤ Board` row** at the top of its
list; clicking it opens the **▤ Board view tab** (preview semantics,
one instance — the Home/Search/Settings pattern): a four-column Kanban
`backlog · ready · in-progress · done`. It is also the UI surface for
the `ready` dispatch state that WO-098's receipt deferred ("surface
the ready state in the desktop UI").

## Each SRC-025 objection answered

1. **"Read-only restatement of the panel"** — the board is now the
   only surface showing the whole four-status lifecycle at once; the
   `ready` lane exists nowhere in the UI today.
2. **"Dies at scale (uncapped DONE)"** — DONE is windowed to the five
   most recently updated with a `▸ show all N done` expander; living
   columns render in full.
3. **"Card extras restate the detail view"** — cards carry only
   id · title · recency (`updated Nd ago`); done cards swap recency
   for the receipt SHA (`✓ abc1234`, green); filled amber dot = check
   issue (SRC-010 shape rule).

## The ready lane

`ready` is entered only by the user's stamp (WO-098/DEC-096) — no
board or segmented-control affordance may perform `backlog → ready`.
Proposed color: the info blue (`--t-req` hue / `--info-*` register);
amber rejected (draft/warning semantics), green rejected (collides
with done). `STATUS_COLORS`, `STATUS_SEGMENTS`, and
`LIVING['work-order']` gain `ready` in the same change.

## Out of scope

No drag-and-drop (WO-053's ruling stands: the detail's segmented
control is the only status mutation). No changes to sidebar anatomy;
the type panel changes only by the one `▤ Board` row. Below ~640px
pane width the grid falls back to a stacked list (container query).

Open question for approval: does the collection click open the board
directly, or does the type panel gain a `▤ Board` affordance?
**Resolved 2026-08-25 by Daniel**: the panel gains the affordance —
the collection click stays a panel toggle (see the revision note).
