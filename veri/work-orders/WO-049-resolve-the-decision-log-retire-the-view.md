---
id: WO-049
type: work-order
title: "Resolve the Decision log — retire the view"
status: done
created: 2026-08-18
updated: 2026-08-18
links:
  - id: REQ-004
    rel: implements
  - id: SRC-023
    rel: designed-by
  - id: SRC-016
    rel: derived-from
---

## Summary

[[SRC-016]] asked that the orphaned Decision log — reachable only via ⌘K, one of three redundant lenses — be resolved. Per [[SRC-023]] the resolution is retirement: remove the decisions view (ViewKey, palette row, views/decisions.ts) from packages/ui, order the Decisions type panel by created date so it inherits the chronological feed, amend [[REQ-004]] to four screens (surfacing as a WO-045 drift advisory until re-approval), and file the retirement as a proposed decision for Daniel's stamp.

## In scope

- Remove the decisions ViewKey, VIEW_META entry, palette view row, and views/decisions.ts; delete the decisionLog derivation if nothing else uses it
- Decisions type panel ordered by created, newest first, keeping status chips
- Verify with a test that a persisted workspace holding a decisions view tab restores cleanly (entry dropped, no migration)
- Amend REQ-004's body to describe four screens; the post-stamp edit is expected to surface as a drift advisory until Daniel re-approves
- File the retirement as a proposed decision (next free DEC id) linking this work order, with rejected alternatives (keep with a sidebar seat; fold into Home)
- Remove now-dead styles and update any tests referencing the view

## Out of scope

- Board and Graph — P2 territory, separate evidence
- Any change to decision documents, their schema, or the approval flow
- Sidebar changes beyond what removing the view requires
- A data migration for workspace files

## Requirements

- [[REQ-004]] — implements
- [[SRC-023]] — designed-by
- [[SRC-016]] — derived-from

## Acceptance tests

- [x] The decisions view is gone: no ViewKey, no palette row, no reachable route; the app builds and runs
- [x] The Decisions type panel lists decisions newest-first by created date with status chips
- [x] A workspace file persisting a decisions view tab restores without error and without the tab (covered by a test)
- [x] REQ-004 describes four screens and the edit surfaces as a drift advisory, not an issue
- [x] A proposed decision records the retirement with rejected alternatives and links this work order
- [x] npm test passes; veri check reports zero issues

## Receipts

- 2026-08-18 — cd05cc2 — packages/ui/src/renderer/tabs.ts, packages/ui/src/renderer/app.ts, packages/ui/src/renderer/derive.ts, packages/ui/src/renderer/sidebar.ts, packages/ui/src/renderer/views/decisions.ts (deleted), packages/ui/renderer/styles.css, packages/ui/src/renderer/tabs.test.ts, packages/ui/src/renderer/sidebar.test.ts, packages/ui/src/renderer/derive.test.ts, veri/requirements/REQ-004-desktop-ui.md, veri/decisions/DEC-045-retire-the-decision-log-view-the-decisions-panel-is-the-chro.md — Retired the Decision log view per SRC-023: removed the decisions ViewKey/palette row/view/derivation/styles, ordered the Decisions panel by created desc, proved clean tab restore with a test, amended REQ-004 to four screens, filed DEC-045 as proposed. The REQ-004 amendment surfaced the expected post-stamp drift advisories (the intended WO-045 path); Daniel's re-stamp cleared them 2026-08-19 (commit 844b3b0).
