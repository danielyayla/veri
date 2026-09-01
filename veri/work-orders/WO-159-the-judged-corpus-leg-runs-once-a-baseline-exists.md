---
id: WO-159
type: work-order
title: "The judged corpus leg runs once — a baseline exists"
status: in-progress
approved: 2026-09-02
claimed_by: fable-wo159
claimed_at: 2026-09-02
created: 2026-09-02
updated: 2026-09-02
links:
  - id: REQ-040
    rel: implements
  - id: DEC-150
    rel: constrained-by
  - id: DEC-129
    rel: constrained-by
  - id: WO-147
    rel: follows-from
# binds:         # code this work order claims (optional)
#   paths: []    # repo-root-relative globs
#   tests: []    # test files proving it (path or path::name)
verify: node packages/cli/dist/cli.js skills eval --judge scripts/trigger-judge.sh
---

## Summary

WO-147 built the runner and DEC-150 chose its judge protocol, and the judged leg has never executed: VERI_TRIGGER_JUDGE is unset, CI skips loudly on every run, and SRC-072 names it as a caveat on REQ-040's supported verdict. Until it runs once, the eval story is a harness that has never evaluated, and DEC-129's no-regression floor protects description bytes without ever having measured what those descriptions achieve. This work order runs the judged leg once, with a minimal judge conforming to DEC-150's contract (one shell command per case, JSON on stdin, verdict as the last non-empty stdout line), and files the result as a source so the next run is a comparison rather than a first impression. Configuring the CI repository variable is the user's act, named at handoff.

## In scope

- `scripts/trigger-judge.sh`: a minimal judge (a `claude -p` wrapper) conforming to DEC-150's stdin/stdout contract, with a comment naming how to re-run the eval with it
- One full judged run over the corpus via `veri skills eval --judge scripts/trigger-judge.sh`
- A source (kind: metric) recording the pass rate, the failing cases by name, and DEC-129's floor read against the result — filed, not acted on

## Out of scope

- Editing corpus cases or trigger descriptions to make the run pass — the baseline is the truth, whatever it says
- Setting VERI_TRIGGER_JUDGE in the repository (the user's act; CI stays loudly skipping until then)
- Failing CI on judge absence (DEC-150 rejected it)
- Any change to the runner itself

## Acceptance tests

- [ ] `scripts/trigger-judge.sh` conforms to DEC-150's contract: invoked once per case, JSON on stdin, verdict as the last non-empty line of stdout
- [ ] A full judged run over all corpus cases completes — the declared verify command proves it
- [ ] The baseline source is filed with the pass rate and named failing cases, linked to DEC-150 and DEC-129
- [ ] DEC-129's no-regression floor is evaluated against the run and the result stated plainly in the source

## Receipts

(none yet)
