---
id: WO-152
type: work-order
title: "Board and Outcomes fold into Home — the app narrows to the judgment surface"
status: backlog
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

- [ ] The app builds with board.ts and outcomes.ts removed and no dead sidebar, palette, or tab entries
- [ ] Home shows untested bets and recent outcome sources (fixture-driven render test)
- [ ] Every lifecycle action the Board surfaced is reachable through the Work Orders panel and detail
- [ ] A design source is linked designed-by and the design gate passes
- [ ] Full suite green

## Receipts

(none yet)
