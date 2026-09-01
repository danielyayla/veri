---
id: WO-146
type: work-order
title: "veri:review exists — the diff is read against the work order before done"
status: ready
approved: 2026-09-01
created: 2026-09-01
updated: 2026-09-01
links:
  - id: REQ-040
    rel: implements
  - id: SRC-060
    rel: derived-from
  - id: DEC-130
    rel: constrained-by
  - id: DEC-125
    rel: constrained-by
  - id: SRC-066
    rel: derived-from
# binds:         # code this work order claims (optional)
#   paths: []    # repo-root-relative globs
#   tests: []    # test files proving it (path or path::name)
---

## Summary

SRC-066's sharpest single finding: veri:review is declared in the trigger corpus, specified in SRC-060, and named as the handoff destination by MET-001 and MET-008 — and was never written. The record routes to a gate nobody staffs. It is also the cheapest Stage-5 win available anywhere: the work order is already a machine-readable review policy (in scope, out of scope, acceptance criteria, linked decisions), so the review pass is one method document that reads the diff against it. Findings ranked important/nit with nits capped, per the playbook's REVIEW.md shape; a finding that recurs proposes an AGENTS.md edit so knowledge compounds.

## In scope

- MET-010, the veri:review method, filed draft per SRC-060's spec and DEC-130's six-section form: read the branch diff against the claimed work order — every in-scope item delivered, nothing out-of-scope touched, every acceptance criterion evidenced, no linked decision silently contradicted
- Findings ranked important/nit, nits capped at five; a repeated finding proposes an AGENTS.md or method edit as a draft
- The did-it-work-vs-review near-miss pair in the trigger corpus gets its real second target
- A requires: list naming the MCP tools the gate needs

## Out of scope

- Promotion (the method lands draft; the shell emits only after Daniel's stamp — REQ-008)
- Wiring the pass into the dispatch workflow before the PR opens (follow-up once the method has run by hand)
- General code review beyond the work order's own boundary (that is the harness's code-review tooling, not this gate)

## Requirements

- [[REQ-040]] — implements
- [[SRC-060]] — derived-from
- [[DEC-130]] — constrained-by
- [[DEC-125]] — constrained-by
- [[SRC-066]] — derived-from

## Acceptance tests

- [ ] MET-010 exists in veri/methods/, status draft, with description, requires, and the six mandatory sections
- [ ] The trigger corpus's review cases and the did-it-work-vs-review pair reference MET-010's skill id and validate
- [ ] veri skills install emits no shell while MET-010 is draft, and emits one on an accepted fixture
- [ ] veri check zero issues with the method filed
- [ ] Full suite green

## Receipts

(none yet)
