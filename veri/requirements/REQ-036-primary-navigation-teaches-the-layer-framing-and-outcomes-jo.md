---
id: REQ-036
type: requirement
title: "Primary navigation teaches the layer framing, and outcomes join it as a first-class view"
status: accepted
approved: 2026-08-27
created: 2026-08-27
updated: 2026-08-27
links:
  - id: SRC-054
    rel: derived-from
  - id: DEC-111
    rel: derived-from
  - id: REQ-033
    rel: relates-to
  - id: REQ-035
    rel: relates-to
---

The sidebar presents the knowledge base through the pivot's four questions (DEC-111, SRC-050): WHY (sources), WHAT (requirements, decisions), HOW (work orders, architecture), DID IT WORK? (outcomes). The layers appear as non-interactive group headers over the existing collections — grouping, never containers: no collection, document, count, or behavior changes, because a document's type is intrinsic while its layer is contextual.

The DID IT WORK? layer, which has no collection, gets a first-class derived view in primary navigation: an always-rendered Outcomes view row opening a one-instance tab showing outcome evidence (sources with tests/supports/refutes links, with verdicts and their hypotheses), untested bets (from the check derivation), and recent receipts. The view is stateless — a rendering over existing documents and the check snapshot; an outcome source appears both in Sources (its type) and in Outcomes (its role).

Per the design in SRC-054.

## Acceptance criteria

- [ ] The sidebar shows WHY / WHAT / HOW / DID IT WORK? headers grouping Sources; Requirements + Decisions; Work Orders + Architecture; Outcomes — with all existing panel behavior unchanged.
- [ ] An always-rendered Outcomes view row opens a one-instance tab with outcome evidence, untested bets, and recent receipts, each entry linking to its documents.
- [ ] The Outcomes view holds no authoritative state and renders a teaching empty state when nothing has reported back.
- [ ] An outcome source is reachable from both the Sources panel and the Outcomes view.
- [ ] `veri check` passes with zero issues.
