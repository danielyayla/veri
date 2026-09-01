---
id: WO-161
type: work-order
title: "review.md takes the diet it arrived too late for"
status: backlog
created: 2026-09-02
updated: 2026-09-02
links:
  - id: REQ-040
    rel: implements
  - id: SRC-069
    rel: constrained-by
  - id: MET-010
    rel: amends
  - id: WO-149
    rel: follows-from
  - id: WO-146
    rel: follows-from
# binds:         # code this work order claims (optional)
#   paths: []    # repo-root-relative globs
#   tests: []    # test files proving it (path or path::name)
verify: bash -c '[ "$(wc -l < veri/methods/review.md)" -le 130 ]'
---

## Summary

MET-010 was written in the same batch that set SRC-069's two-screen ceiling and never passed through WO-149's diet: 251 lines against the nine gates' 111–130. Same pass, same rules: cut to the ceiling without changing what a rule says. WO-149's precedent binds — a cut that would change a rule's meaning is a stop, reported and held for the user rather than taken. The shell regenerates from the method; trigger-description bytes stay untouched so the corpus floor holds; the re-stamp of the amended method is the user's act.

## In scope

- `veri/methods/review.md` brought to or under the two-screen ceiling, keeping all six sections and the promotion guardrail sentence verbatim
- Shell regenerated via `veri skills install`
- Corpus integrity floor clean after the pass

## Out of scope

- Changing what the gate checks, its findings ranking, its nit cap, or its handoffs — this is a diet, not a redesign
- Any other method; any corpus edit; any trigger-description byte
- The re-stamp of MET-010 (the user's act)

## Acceptance tests

- [ ] review.md at or under 130 lines — the declared verify command proves it — with all six sections and the promotion guardrail verbatim
- [ ] No rule changed meaning; a cut that would have is reported and the work order held instead (WO-149 precedent)
- [ ] Shell regenerated and matching; trigger-description bytes untouched; corpus integrity floor clean

## Receipts

(none yet)
