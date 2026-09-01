---
id: WO-152
type: work-order
title: "Board and Outcomes fold into Home — the app narrows to the judgment surface"
status: done
approved: 2026-09-01
claimed_by: fable-wo152
claimed_at: 2026-09-01
created: 2026-09-01
updated: 2026-09-01
links:
  - id: REQ-036
    rel: amends
  - id: REQ-035
    rel: serves
  - id: REQ-004
    rel: constrained-by
  - id: SRC-047
    rel: revisits
  - id: SRC-066
    rel: derived-from
  - id: SRC-068
    rel: designed-by
binds:
  paths:
    - packages/ui
---

## Summary

PRD-002 defines what the user needs: "a judgment surface, not an execution board" — and SRC-066 found roughly half the app serving execution display. The Board is deliberately read-only (no drag; the WO detail's control is the sole mutation), so it is a filter wearing a view; Outcomes visualizes three documents. Both fold away: the Work Orders panel and detail carry the lifecycle, and Home absorbs the one live signal (untested bets, recent outcome sources) it mostly already shows. BLOCKERS: REQ-036 names Outcomes as a first-class navigation view, so a proposed decision and Daniel's amendment of that intent come first; packages/ui is design-gated, so a design note linked designed-by precedes start. binds.paths declares packages/ui (frontmatter edit applied with the filing).

## In scope

- Retire the Board view; the Work Orders type panel plus the detail's status control carry the lifecycle end to end
- Retire the Outcomes view after folding untested bets and recent outcome evidence into Home's existing sections (CURRENT BETS, RECENTLY LEARNED)
- Sidebar, tab-strip, palette, and route cleanup so no surface points at the removed views
- A design note filed as a source and linked designed-by before start

## Out of scope

- The reader, review/approve surface, work-order detail, settings, and import (the judgment surface stays whole)
- Receipts display anywhere it exists today
- Removing REQ-036's file (amending the requirement is Daniel's act on the requirement itself)

## Requirements

- [[REQ-036]] — amends
- [[REQ-035]] — serves
- [[REQ-004]] — constrained-by
- [[SRC-047]] — revisits
- [[SRC-066]] — derived-from

## Acceptance tests

- [x] The app builds with board.ts and outcomes.ts removed and no dead sidebar, palette, or tab entries
- [x] Home shows untested bets and recent outcome sources (fixture-driven render test)
- [x] Every lifecycle action the Board surfaced is reachable through the Work Orders panel and detail
- [x] A design source is linked designed-by and the design gate passes
- [x] Full suite green

## Receipts

- 2026-09-01 — 957f463 — Board and Outcomes views removed (views, View/ViewKey unions, sidebar row + DID IT WORK? header, tp-board row, palette entries, session state, view-only derive helpers), Home absorbed the verdict chips and teaching empty state with an all-three-verdicts fixture test, stale board/outcomes tabs restore to Home; no verify: declared — packages/ui suite 340/340 green, build exit 0, veri check 0 issues.
