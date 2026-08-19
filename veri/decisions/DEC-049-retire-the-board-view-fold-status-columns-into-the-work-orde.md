---
id: DEC-049
type: decision
title: "Retire the Board view — fold status columns into the Work Orders panel"
status: proposed
created: 2026-08-19
updated: 2026-08-19
links:
  - id: WO-053
    rel: constrains
---

## Choice

The Board screen is removed outright and its one distinctive signal — status columns — folds into the Work Orders type panel: the living list gains BACKLOG and IN PROGRESS micro-header subgroups (work orders only; other types keep the flat list), with done work orders staying behind the panel's collapsed `▸ N done` expander. The `board` ViewKey, `VIEW_META` entry, sidebar entry, render arm, `views/board.ts`, `boardColumns`/`BoardCard` derivations, and board styles are deleted; persisted tabs holding `board` restore away via the retainTabs mechanism (WO-049), verified by a test, never a migration. Card extras (linked-REQ count, agent marker) are dropped, not relocated.

## Rejected alternatives

- **Time-windowed DONE column (keep Board, cap history)** — windowing would keep a fourth surface alive to restate what the Work Orders panel already shows; SRC-016 found Board is "a read-only restatement of the Work Orders panel", and the panel's `▸ N done` expander is already the time-window Board never had — demand reveals history, scale stays flat.
- **Keep Board as-is** — it dies at scale: `boardColumns` pushed every work order into an uncapped DONE column ("a DONE column with 380 cards"), it carried no status-mutation affordance the detail view lacks, and SRC-016 put it on the remove-50% list.

## Rationale

SRC-016's critique offered "Board time-windowing or demotion" and the evidence picks demotion three times over (read-only restatement, uncapped DONE column, remove-50% list). SRC-025 maps every distinctive signal Board carried onto the panel that already has the sidebar seat: kanban columns become living-list subgroups in the existing micro-label register, the DONE column is already better served by the collapsed expander, and card extras restate what the work-order detail shows one click away. With SRC-023 (Decision log) and SRC-024 (Graph) this completes the redundant-lens removals: REQ-004 now describes two screens plus cross-cutting surfaces.
