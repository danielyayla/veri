---
id: WO-010
type: work-order
title: veri check enforces the design gate for UI work orders
status: in-progress
created: 2026-08-08
updated: 2026-08-13
links:
  - id: REQ-002
    rel: extends
  - id: DEC-012
    rel: constrained-by
  - id: WO-002
    rel: depends-on
  - id: WO-005
    rel: depends-on
  - id: SRC-011
    rel: designed-by
---

## Summary

Make the design-first rule from [[DEC-012]] machine-checked instead of
prose-only. `veri check` gains an issue kind for work orders that touch
the UI but carry no `designed-by` link: a work order is UI-touching when
its body mentions `packages/ui`, and any such work order with status
`in-progress` or `done` must link at least one document with
`rel: designed-by` that resolves to an existing doc.

`backlog` work orders are exempt — the gate fires when implementation
starts, not when the idea is filed.

## In scope

- New `veri check` issue kind: "UI work order <id> has no designed-by
  link" (fires on `in-progress`/`done` work orders whose body contains
  `packages/ui`)
- The linked design doc must exist and parse (reuses the existing
  broken-link machinery)
- Tests: gated WO without link fails, with link passes, backlog WO is
  exempt
- Backfill `designed-by` links (or explicit exemption notes) on
  existing done UI work orders WO-005/WO-006/WO-007 so this repo passes
  its own check — pre-DEC-012 work may link a retroactive note-style
  source doc

## Out of scope

- Judging design quality or completeness — presence and resolvability
  only
- A new `design` document type (DEC-012 chose `source`)
- UI changes of any kind
- Detecting UI-touching work orders by git diff or file lists;
  body-text mention of `packages/ui` is the v1 heuristic

## Requirements

Constrained by [[DEC-012]]. Builds on the check machinery from
[[WO-002]] and gates future work on the UI from [[WO-005]].

## Acceptance tests

- [x] `veri check` flags an `in-progress` work order mentioning
      `packages/ui` with no `designed-by` link
- [x] The same work order with a resolvable `designed-by` link passes
- [x] A `backlog` UI work order with no link passes
- [x] A `designed-by` link pointing at a missing id is reported
- [x] `veri check` on this repo reports zero issues (after backfill)
- [x] All existing tests still pass

## Receipts

(none yet)
