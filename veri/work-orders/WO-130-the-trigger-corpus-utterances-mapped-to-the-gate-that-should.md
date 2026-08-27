---
id: WO-130
type: work-order
title: "The trigger corpus: utterances mapped to the gate that should answer them"
status: done
claimed_by: opus-wo130
claimed_at: 2026-08-27
approved: 2026-08-27
created: 2026-08-27
updated: 2026-08-27
links:
  - id: DEC-129
    rel: implements
  - id: REQ-040
    rel: implements
  - id: SRC-060
    rel: derived-from
  - id: DEC-125
    rel: constrained-by
binds:
  paths:
    - skills/trigger-corpus.yaml
    - packages/core/src/skill-corpus.ts
  tests:
    - packages/core/src/skill-corpus.test.ts
---

## Summary

The committed corpus [[DEC-129]] gates on — utterances paired with the skill that should fire, plus a negative set that should fire nothing. [[DEC-129]] is explicit that the corpus's coverage, not its score, is the artifact worth defending, and that the floor is no-regression-plus-zero-false-positives rather than a percentage.

This is deliberately the **first** piece of skill work and the only one not blocked by the open method-document type question. Writing it first is not merely convenient: to say which skill should answer "I want to change how auth works", you have to decide where `define` ends and `decide` begins, and whether that utterance is discovery or a work-order request. The corpus forces the fourteen gate boundaries of [[SRC-060]] to be stated concretely before fourteen method documents are authored against them. Disagreements found here are cheap; the same disagreements found after authoring are not.

The corpus is data plus a schema — no runner. A runner needs emitted shells to exercise, which needs the type decision and the emitter; it is a later work order. What ships here is the artifact a runner will later consume, reviewable on its own as a statement of what each skill is for.

## In scope

- A committed corpus file mapping each utterance to the expected skill id, or to none for negatives, with a documented schema
- Coverage of all fourteen skills in [[SRC-060]], including the six advanced ones — a skill with no case is a skill whose boundary was never stated
- **Near-miss pairs** between adjacent gates, called out as such: `define`/`decide`, `plan-work`/`implement`, `product-discovery`/`user-discovery`, `did-it-work`/`review`, `wayfinder`/`archaeology`. These are the cases that actually discriminate; a corpus of obvious utterances proves nothing
- A **negative set** of utterances that must fire nothing — ordinary coding requests, questions about the codebase, and chit-chat — since [[DEC-129]] makes zero false triggers the hard half of the floor
- The vague front-door utterances [[REQ-040]] names by example: "I have an idea for a product", "I need to change something in this codebase", "what should I work on next?", "why did we build this this way?"
- A short rationale line per near-miss case recording *why* it belongs to one gate and not its neighbour — this is the part a reviewer checks, and the part that will be cited when a boundary is later disputed
- Tests that validate the corpus against its schema: every entry well-formed, every skill id known, no duplicate utterances

## Out of scope

- **The runner or harness that executes the corpus.** It needs emitted shells to exercise; separate work order once the emitter exists
- **Wiring the gate into CI.** [[DEC-129]] specifies the floor, but there is nothing to run until the runner exists; adding a no-op job now would be a green check that proves nothing
- **Authoring any method document.** Blocked on the open type question ([[DEC-125]] deferred it deliberately) and out of scope regardless — this work order states what the skills are *for*, not what they say
- **The shell emitter and its trigger descriptions.** The corpus is the target those descriptions will be written against, not a source of them
- **Tuning skill descriptions to pass the corpus.** No descriptions exist yet; a corpus written to match text that does not exist would invert the whole point
- **The canon-consistency check rule** from [[DEC-129]] — a separate work order, also blocked on the type question

## Requirements

- [[DEC-129]] — implements
- [[REQ-040]] — implements
- [[SRC-060]] — derived-from
- [[DEC-125]] — constrained-by

## Acceptance tests

- [x] A corpus file exists with a documented schema, committed to the repo
- [x] Every one of [[SRC-060]]'s fourteen skills appears as the expected answer for at least one utterance
- [x] Each of the five named near-miss pairs has at least one case on each side, with a rationale line explaining the boundary
- [x] A negative set exists whose expected answer is that no skill fires, covering ordinary coding requests and codebase questions
- [x] The four front-door utterances [[REQ-040]] names by example are present
- [x] Schema tests pass: every entry well-formed, every skill id recognised, no duplicate utterances
- [x] `veri check` reports zero issues

## Receipts

- 2026-08-27 — b4121b2 — skills/trigger-corpus.yaml, packages/core/src/skill-corpus.ts, packages/core/src/skill-corpus.test.ts, packages/core/src/index.ts, action/dist/index.js, veri/decisions/DEC-134-the-trigger-corpus-is-a-repo-level-yaml-data-file-with-its-s.md, veri/ids — the corpus lands: 59 cases covering all fourteen [[SRC-060]] skills, the five near-miss pairs with a boundary statement each and a rationale on every discriminating case, 16 negatives that must fire nothing, plus the schema, its invariants, and ten tests; [[DEC-134]] files format, location and schema shape as proposed; no runner, no shells, no method documents (all out of scope); core suite 311 green, check 0 issues
