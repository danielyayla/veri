---
id: REQ-036
type: requirement
title: "Primary navigation teaches the layer framing"
status: accepted
approved: 2026-08-27
created: 2026-08-27
updated: 2026-09-01
links:
  - id: DEC-145
    rel: constrained-by
  - id: SRC-054
    rel: derived-from
  - id: DEC-111
    rel: derived-from
  - id: REQ-033
    rel: relates-to
  - id: REQ-035
    rel: relates-to
---

The sidebar presents the knowledge base through the pivot's questions (DEC-111, SRC-050): WHY (sources), WHAT (requirements, decisions), HOW (work orders). The layers appear as non-interactive group headers over the existing collections — grouping, never containers: no collection, document, count, or behavior changes, because a document's type is intrinsic while its layer is contextual.

The fourth question — DID IT WORK? — is answered on Home, not by a header ([[DEC-145]]): outcome evidence (sources with tests/supports/refutes links, with verdicts and their hypotheses) and untested bets (from the check derivation) render in Home's sections per [[REQ-035]], derived and stateless. An outcome source appears both in Sources (its type) and on Home (its role). A header over no collection and no view would group nothing, and headers group — they never navigate.

Per the design in SRC-054, whose Outcomes-view half [[DEC-145]] revisits.

## Acceptance criteria

- [ ] The sidebar shows WHY / WHAT / HOW headers grouping Sources; Requirements + Decisions; Work Orders — with all existing panel behavior unchanged.
- [ ] Home renders outcome evidence and untested bets, each entry linking to its documents, with a teaching empty state when nothing has reported back.
- [ ] An outcome source is reachable from both the Sources panel and Home's recently-learned section.
- [ ] `veri check` passes with zero issues.
