---
id: WO-143
type: work-order
title: "Dispatch replaces ready — approve-and-start becomes one gesture"
status: done
claimed_by: fable-wo143
claimed_at: 2026-09-01
approved: 2026-09-01
created: 2026-09-01
updated: 2026-09-01
links:
  - id: REQ-008
    rel: constrained-by
  - id: REQ-039
    rel: amends
  - id: REQ-015
    rel: constrained-by
  - id: SRC-066
    rel: derived-from
# binds:         # code this work order claims (optional)
#   paths: []    # repo-root-relative globs
#   tests: []    # test files proving it (path or path::name)
---

## Summary

SRC-066's audit: the ready state exists so a stamp can precede a claim, but the record shows the stamp batch-applied minutes before dispatch — a queue of ceremony, not of judgment, and the playbook's named anti-pattern (approval prompts on the build's critical path). A work order should be approved by being dispatched: one gesture (veri dispatch WO-nnn --as session) that stamps and claims in a single write and a single commit. This removes ready from the status enum, retires stamped-backlog, and re-scopes veri next and start_work_order. BLOCKER: this reverses accepted intent (REQ-039 names ready; the start_work_order contract changes; the status enum change is a knowledge-base format bump) — veri:decide must settle the shape and Daniel must stamp it first, and the format bump waits until WO-125 ships format 4.

## In scope

- Remove ready from the work-order status enum; backlog → in-progress happens only through dispatch, which writes approved, claimed_by, and claimed_at together
- veri dispatch in the CLI; the decision settles whether start_work_order survives (e.g. claiming a user-pre-approved work order) or retires
- Retire or redefine stamped-backlog and the ready-specific check rules; migration for on-disk ready work orders; format marker bump with a real migration step
- Rewrite workflow rule 8 and the queue surfaces (veri next, get_queue) to the new shape

## Out of scope

- The UI status control beyond deleting the refused ready segment (packages/ui design pass is a follow-up)
- The autonomous dispatcher workflow's semantics (it currently polls veri next; deciding its future is part of the DEC, implementing it is not this slice)
- Any change to who stamps (the user, always)

## Requirements

- [[REQ-008]] — constrained-by
- [[REQ-039]] — amends
- [[REQ-015]] — constrained-by
- [[SRC-066]] — derived-from

## Acceptance tests

- [x] The work-order schema has no ready status, and veri dispatch flips backlog to in-progress with stamp and claim in one write
- [x] MCP e2e proves no agent path can dispatch
- [x] A project holding an on-disk ready work order migrates cleanly and veri check passes after migration
- [x] stamped-backlog no longer exists or its replacement is tested against the new semantics
- [x] workflow.md rule 8 and the docs describe the single gesture; full suite green

## Receipts

- 2026-09-01 — d624dce..587de5a — dispatch replaces ready (DEC-143): one gesture stamps and claims, format 5 migrates this repo's ready queue to stamped backlog, start_work_order retires; site/README/methods truth-sweep rides WO-148 (its named scope), receipt filed by direct append because the running MCP server refuses format 5 until restarted (DEC-139)
