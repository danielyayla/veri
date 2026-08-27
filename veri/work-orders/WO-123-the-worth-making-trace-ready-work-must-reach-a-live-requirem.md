---
id: WO-123
type: work-order
title: "The worth-making trace: ready work must reach a live requirement"
status: in-progress
claimed_by: fable-wo123
claimed_at: 2026-08-27
approved: 2026-08-27
created: 2026-08-27
updated: 2026-08-27
links:
  - id: REQ-039
    rel: implements
  - id: SRC-056
    rel: derived-from
# binds:         # code this work order claims (optional)
#   paths: []    # repo-root-relative globs
#   tests: []    # test files proving it (path or path::name)
---

## Summary

`veri check` gains the trace check from REQ-039: a `ready` or `in-progress` work order that does not trace, directly or transitively through its links, to a live (non-withdrawn, non-retired) requirement is orphan execution and fails the check; backlog stays exempt.

## In scope

- Core: transitive trace derivation from a work order's links to a live requirement (traversal rules — which rels count, cycle handling — are a DEC filed during implementation)
- `veri check`: the trace check as a violation for `ready`/`in-progress` work orders, exempting `backlog` and `done`
- Audit existing ready/in-progress work orders and surface any that would fail, for the user's judgment before the check lands as blocking
- Tests over direct, transitive, missing, and withdrawn-requirement traces

## Out of scope

- Context-package assembly changes (separate WO under REQ-039)
- Changes to the WO schema or template
- UI surfacing of the trace (design-gated)

## Requirements

- [[REQ-039]] — implements
- [[SRC-056]] — derived-from

## Acceptance tests

- [ ] A ready WO linked only to a withdrawn requirement fails `veri check`
- [ ] A ready WO reaching a live requirement transitively (e.g. via a DEC) passes
- [ ] A backlog WO with no links passes
- [ ] Existing repo state passes, or every failure was shown to the user first
- [ ] Zero `veri check` violations repo-wide

## Receipts

(none yet)
