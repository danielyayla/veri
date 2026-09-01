---
id: WO-154
type: work-order
title: "The learning loop's plumbing completes — outcome-of consumed, source kinds meaningful, discovery files bets"
status: backlog
approved: 2026-09-01
created: 2026-09-01
updated: 2026-09-01
links:
  - id: REQ-033
    rel: implements
  - id: REQ-038
    rel: implements
  - id: REQ-032
    rel: implements
  - id: DEC-113
    rel: constrained-by
  - id: SRC-066
    rel: derived-from
# binds:         # code this work order claims (optional)
#   paths: []    # repo-root-relative globs
#   tests: []    # test files proving it (path or path::name)
---

## Summary

SRC-066 found the loop's machinery half-wired: outcome-of is validated for direction and consumed by nothing; source kinds are validated and read by no rule (14 of 63 sources declare one); and discovery's defaults produced 2 hypotheses among 41 requirements — assumption laundered into constraint at scale, the exact failure REQ-032 exists to prevent. Three completions, each small: outcome-of gets consumers, outcome-shaped links get a kind expectation, and the discovery/define methods invert their default so an unevidenced want files as a bet with a metric. Evidence still never auto-promotes anything (PRD-003 principle 5).

## In scope

- Context packages render inbound outcome-of sources on the work order ("what shipped here reported back"), and get_receipts' corpus sweep names them
- Advisory: a source linking tests/supports/refutes or outcome-of without kind: outcome earns a nudge (naming the fix, never rewriting the file)
- MET-003 and MET-005 invert the default: a want without evidence files as kind: hypothesis with an outcome block; constraint is the argued exception
- Corpus floor re-run after the method edits

## Out of scope

- Auto-promoting, auto-kinding, or auto-retiring anything (judging evidence is the user's act — PRD-003 principle 5)
- Backfilling kinds on the 63 existing sources (PRD-004's evidence-backfill thread; human verdicts)
- The UI Outcomes view (WO-152 owns its fate)

## Requirements

- [[REQ-033]] — implements
- [[REQ-038]] — implements
- [[REQ-032]] — implements
- [[DEC-113]] — constrained-by
- [[SRC-066]] — derived-from

## Acceptance tests

- [ ] A context package for a work order with an inbound outcome-of source shows it in the work-order section (fixture)
- [ ] The kind advisory fires on an outcome-linked source without kind: outcome and stays silent with it
- [ ] MET-003 and MET-005 state the bet-first default and the corpus floor holds
- [ ] get_receipts output names outcome evidence where it exists
- [ ] Full suite green, veri check zero issues

## Receipts

(none yet)
