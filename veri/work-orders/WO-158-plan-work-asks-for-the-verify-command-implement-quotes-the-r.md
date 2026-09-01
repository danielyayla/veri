---
id: WO-158
type: work-order
title: "plan-work asks for the verify command; implement quotes the run"
status: done
approved: 2026-09-02
claimed_by: fable-wo158
claimed_at: 2026-09-02
created: 2026-09-02
updated: 2026-09-02
links:
  - id: REQ-042
    rel: implements
  - id: DEC-149
    rel: constrained-by
  - id: SRC-069
    rel: constrained-by
  - id: MET-007
    rel: amends
  - id: MET-001
    rel: amends
  - id: WO-145
    rel: follows-from
# binds:         # code this work order claims (optional)
#   paths: []    # repo-root-relative globs
#   tests: []    # test files proving it (path or path::name)
verify: node packages/cli/dist/cli.js skills eval
---

## Summary

REQ-042 shipped the verify contract and the record shows zero adopters — including the fourteen migration work orders that built it, whose receipts instead grew an undesigned ritual, the literal phrase "no verify: declared". Adoption is behavioral, and the behavior lives in the methods: veri:plan-work should ask each slice how a machine would check it and write the answer into `verify:`, and veri:implement should quote the declared command's run in the receipt — and stop declaring absence. Both edits stay inside SRC-069's two-screen ceiling and leave trigger-description bytes untouched, so the corpus floor holds. The re-stamp of the amended methods is the user's act (WO-149 precedent).

## In scope

- MET-007 (plan-work) gains a beat: each slice is asked for its one machine-checkable command, filed as `verify:` — with the honest out that some slices have none, and saying so beats inventing one
- MET-001 (implement) receipt guidance: when the work order declares `verify:`, the receipt quotes the run's result; when it declares none, the receipt says nothing about it
- Shells regenerated via `veri skills install`; both methods held at or under the two-screen ceiling

## Out of scope

- Schema or check-rule changes — the field and the `verify-unevidenced` advisory stand as shipped
- Tightening DEC-149's evidence heuristic (revisit once adoption exists, per its own revisit condition)
- Editing any other method; editing trigger descriptions
- The re-stamp of MET-001 and MET-007 (the user's act)

## Acceptance tests

- [x] MET-007's interview carries the verify beat, tied to REQ-042's first clause
- [x] MET-001 instructs quoting the declared command's run and never declaring its absence
- [x] Shells regenerated and matching their methods; trigger-description bytes untouched
- [x] Corpus integrity floor clean — the declared verify command proves it
- [x] Both methods at or under SRC-069's two-screen ceiling

## Receipts

- 2026-09-02 — b4ee546 — ["veri/methods/plan-work.md", "veri/methods/implement.md"] — verify ran clean (node packages/cli/dist/cli.js skills eval — 49 cases over 10 skills validate, exit 0) — MET-007 beat 2 asks each slice for its machine-runnable command as verify: (REQ-042 first clause) with the no-parameter mechanical note, MET-001 quotes a declared run and never declares absence, both hold SRC-069's ceiling at 130/114 lines, all 10 shells match with description bytes untouched, veri check 439 docs 0 issues with the two expected stamp-drift advisories awaiting Daniel's re-stamp.
