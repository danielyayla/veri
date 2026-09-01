---
id: WO-147
type: work-order
title: "The trigger corpus gets its runner — DEC-129's floor becomes mechanical"
status: done
approved: 2026-09-01
claimed_by: fable-wo147
claimed_at: 2026-09-01
created: 2026-09-01
updated: 2026-09-01
links:
  - id: REQ-040
    rel: implements
  - id: DEC-129
    rel: implements
  - id: SRC-066
    rel: derived-from
# binds:         # code this work order claims (optional)
#   paths: []    # repo-root-relative globs
#   tests: []    # test files proving it (path or path::name)
---

## Summary

The corpus (587 lines, near-miss pairs, a declared no-regression floor per DEC-129) is the playbook's eval suite in data form — and it has never run. Config changes to the method layer ship unregression-tested, and the corpus has already drifted: three of five near-miss pairs discriminate against skills that do not exist. Smallest honest runner: referential integrity enforced mechanically (a case or pair naming a skill with no MET document fails), plus a harness that plays each utterance against the installed trigger descriptions through a pluggable judge command and reports per-case pass/fail, wired to run on any change under veri/methods/ or skills/.

## In scope

- Referential integrity as a hard failure: every case expect and every near-miss pair must name a skill whose MET document exists (or none)
- A runner (veri skills eval or a repo script) that iterates the corpus against the emitted trigger descriptions via a user-supplied judge command, reporting pass/fail per case and the negative set's false-trigger count
- CI wiring: the integrity check on every push; the judged run on changes to veri/methods/ or skills/
- Fixing or removing the corpus entries that currently reference phantom skills, coordinated with WO-146 and WO-148

## Out of scope

- Shipping an LLM, network calls, or a judge in the product itself (v1's no-network constraint holds; the judge is the user's command)
- Grading the coaching bodies of methods (the corpus tests routing, not content)
- Raising the floor beyond DEC-129's no-regression-plus-zero-false-triggers

## Requirements

- [[REQ-040]] — implements
- [[DEC-129]] — implements
- [[SRC-066]] — derived-from

## Acceptance tests

- [x] A corpus case naming a skill with no MET document fails validation loudly
- [x] The runner executes the full coverage and negative sets against a stub judge in tests and reports per-case results
- [x] CI runs the integrity check on push and the judged run on method/corpus changes
- [x] The shipped corpus validates clean end to end
- [x] Full suite green

## Receipts

- 2026-09-01 — 85d219d — checkCorpusIntegrity plus `veri skills eval` (shell-command judge, per-case report, DEC-129 floor as exit code) land with the phantom-skill corpus entries retired and CI wired (integrity every push, judged run on method/corpus changes via VERI_TRIGGER_JUDGE, loud skip until set); no verify: declared — full suite 952 tests green across five workspaces and `veri check` 0 issues; DEC-150 filed proposed.
