---
id: SRC-025
type: source
title: Design note — Fold Board into the Work Orders panel
status: imported
created: 2026-08-19
updated: 2026-08-19
links:
  - id: REQ-004
    rel: designs
  - id: SRC-014
    rel: builds-on
  - id: SRC-016
    rel: derived-from
  - id: DEC-012
    rel: constrained-by
---

> Drafted 2026-08-19 by an agent session (Claude Code) for the Board
> resolution work order, per the DEC-012 design gate, under Daniel's
> P2 implementation directive. Pending Daniel's review. A removal note
> in the [[SRC-011]] register, the [[SRC-023]] pattern applied to the
> second redundant lens.

[[SRC-016]] offered "Board time-windowing or demotion". The evidence
picks demotion three times over: Board is "a read-only restatement of
the Work Orders panel", it dies at scale ("a DONE column with 380
cards" — `boardColumns` in `derive.ts` pushes every work order,
uncapped), and it is on the remove-50% list ("fold Board into the
Work Orders panel"). Windowing would keep a fourth surface alive to
show what the panel already shows. Fold it.

## Resolution: retire the view, promote the panel's grouping

Remove the `board` ViewKey and `VIEW_META` entry (`tabs.ts`), sidebar
entry, render-switch arm, `views/board.ts`, `boardColumns`/`BoardCard`
in `derive.ts`, and the `.screen-board`/board styles. The palette row
disappears with `VIEW_META`; tabs holding `board` restore away via
`retainTabs` (the WO-049 mechanism). Verify with a test, never a
migration.

Every distinctive signal Board carried maps onto the Work Orders type
panel ([[SRC-014]]'s browser, which already has the sidebar seat):

- **Kanban columns** → the panel's living list gains status
  subgroups: a BACKLOG micro-header and an IN PROGRESS micro-header
  (same `.micro-label` register as Pinned/All), replacing the flat
  living list for work orders only. Other types keep the flat list.
- **The DONE column** → already better in the panel: the collapsed
  `▸ N done` expander is the time-window Board never had — demand
  reveals history, scale stays flat.
- **Card extras** (linked-REQ count, agent marker) → dropped, on the
  evidence: they restate what the work-order detail shows one click
  away, and the panel row (id, title, status) is the [[SRC-014]]
  canon. The health indicator already exists as check indicators.

[[REQ-004]] is amended in the same change: screen 3 (Board) is
retired; with [[SRC-024]] retiring screen 4, the requirement
describes two screens plus the cross-cutting surfaces. The post-stamp
edit surfaces as a drift advisory until Daniel re-approves. The
retirement is filed as a proposed decision for Daniel's stamp.

## Everything unchanged

The panel's filter, newest-first order, pinned group, expander
mechanics, and row anatomy; the work-order detail's status control
(still the only status mutation — Board never had one); Home's IN
FLIGHT; agent kickoff.
