---
id: WO-053
type: work-order
title: "Fold Board into the Work Orders panel"
status: backlog
created: 2026-08-19
updated: 2026-08-19
links:
  - id: REQ-004
    rel: implements
  - id: SRC-025
    rel: designed-by
  - id: SRC-016
    rel: derived-from
---

## Summary

Board is retired per [[SRC-025]]: it is a read-only restatement of the Work Orders panel, it dies at scale (an uncapped DONE column), and [[SRC-016]] put it on the remove-50% list. Its one distinctive signal — status columns — folds into the Work Orders type panel as BACKLOG / IN PROGRESS micro-header subgroups in the living list (work orders only; other types keep the flat list); the collapsed `▸ N done` expander already time-windows history better than a column ever did. The `board` ViewKey, view, derivations, and styles are removed; tabs holding `board` restore away via the WO-049 mechanism. [[REQ-004]] is amended (screen 3 retired; with [[SRC-024]] the requirement describes two screens plus cross-cutting surfaces) — expected drift advisory until Daniel re-stamps; the retirement is filed as a proposed decision.

## In scope

- Status subgroups in the Work Orders type panel's living list: BACKLOG and IN PROGRESS micro-headers in the existing `.micro-label` register, panel order preserved within each
- Removal of the Board view: `board` ViewKey/`VIEW_META`, sidebar entry, render-switch arm, `views/board.ts`, `boardColumns`/`BoardCard` in `derive.ts`, `.screen-board`/board styles, the `SCROLL_SEL` entry, related tests
- A test that tabs holding `board` targets restore away
- Amend [[REQ-004]] body: screen 3 retired per SRC-025
- File the retirement as a proposed decision (DEC → this WO, `constrains`)

## Out of scope

- The Graph view ([[SRC-024]], its own order)
- Any status-mutation affordance in the panel (the work-order detail's control remains the only one)
- Card extras (REQ count, agent marker) — dropped per SRC-025, not relocated
- Changes to other type panels, the expander mechanics, or the panel filter

## Requirements

- [[REQ-004]] — implements
- [[SRC-025]] — designed-by
- [[SRC-016]] — derived-from

## Acceptance tests

- [ ] The Work Orders panel shows BACKLOG and IN PROGRESS subgroups over the living list, done stays collapsed behind the expander; other type panels are unchanged
- [ ] The Board view is gone: no ViewKey, sidebar entry, palette row, or render arm; a persisted `board` tab target restores away cleanly (test)
- [ ] REQ-004 amended; `veri check` reports the expected drift advisory for it and zero issues; full typecheck and test suite pass

## Receipts

(none yet)
