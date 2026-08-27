---
id: WO-134
type: work-order
title: "The back-half default methods — plan-work, did-it-work, health"
status: done
claimed_by: opus-wo134
claimed_at: 2026-08-27
approved: 2026-08-27
created: 2026-08-27
updated: 2026-08-27
links:
  - id: DEC-130
    rel: implements
  - id: REQ-040
    rel: implements
  - id: DEC-125
    rel: constrained-by
  - id: DEC-128
    rel: constrained-by
  - id: SRC-060
    rel: derived-from
  - id: SRC-062
    rel: derived-from
  - id: WO-132
    rel: depends-on
  - id: WO-130
    rel: consistent-with
# binds:         # code this work order claims (optional)
#   paths: []    # repo-root-relative globs
#   tests: []    # test files proving it (path or path::name)
---

## Summary

Three method documents covering the gates from approved intent to learning: `veri:plan-work`, `veri:did-it-work`, `veri:health`. With [[WO-132]]'s `veri:implement`, this completes the nine default skills.

These are the half [[DEC-128]] says Veri **can** prove on itself, by continuous dogfood — the repo has 130 work orders and a live check surface to exercise them against. They are correspondingly easier to author: `plan-work` and `health` largely codify practices this repo already runs, and their coaching can be checked against what actually happened here.

`veri:did-it-work` is the exception and the important one. [[SRC-062]] established that this project completed 123 work orders and filed **zero** outcome sources before that source existed — the loop [[WF-001]] describes had never once closed. This skill staffs precisely the gate that was never staffed, so its content cannot be derived from this repo's habits; the habit is the thing it exists to change.

## In scope

- Three method documents under `veri/methods/`, status `draft`, complete under the template with `description:`, `requires:`, and `upstream:`
- `veri:plan-work` must be design-gate aware per [[DEC-012]] and [[DEC-114]]: work touching a `design_gate_paths` entry needs a `designed-by` link and a `binds: paths:` declaration before it can start
- `veri:did-it-work` must keep three questions separate — did we build what we said, does what must hold still hold, did the bet pay off — and must file an outcome source with the correct `tests`/`supports`/`refutes` rel ([[REQ-033]], [[DEC-113]]). It never applies a verdict to the requirement: judging the evidence is the user's act
- `veri:did-it-work` must handle the answer [[SRC-062]] actually produced — *neither supported nor refuted* — as a first-class outcome. A skill that offers only confirm-or-refute will push agents to overclaim, which is the failure mode that makes outcome evidence worthless
- `veri:health` sweeps the decay `veri check`'s hard rules do not catch — stale documents, arrived revisit conditions, abandoned claims, untested bets, orphans — and files a health-report source so successive sweeps compare
- Near-miss disambiguation in each `description:` per [[WO-130]]: `plan-work`/`implement` and `did-it-work`/`review` both straddle this set

## Out of scope

- The front-half defaults and every advanced skill
- Re-deciding the authoring form settled by [[WO-132]]
- Promoting anything to `accepted`
- New `veri check` rules. `veri:health` reads what check already reports and adds the judgment-shaped sweep on top; if it wants a rule check does not have, that is a proposed decision and its own work order
- Filing any actual outcome source for this repo's existing work orders. Authoring the skill is not the same act as running it

## Requirements

- [[DEC-130]] — implements
- [[REQ-040]] — implements
- [[DEC-125]] — constrained-by
- [[DEC-128]] — constrained-by
- [[SRC-060]] — derived-from
- [[SRC-062]] — derived-from
- [[WO-132]] — depends-on
- [[WO-130]] — consistent-with

## Acceptance tests

- [x] All three parse, raise no `missing-section` advisory, and `veri check` reports 0 issues
- [x] `veri:did-it-work`'s document names *inconclusive* as a valid, expected outcome and says what to file for it — the case [[SRC-062]] hit on the project's first attempt
- [x] `veri:did-it-work`'s guardrails state that it never changes a requirement's status: outcome evidence never auto-applies a verdict ([[WF-001]] rule 9)
- [x] `veri:plan-work`'s document states the design gate as a precondition on starting, not on planning — matching [[WF-001]] rule 7 rather than overstating it
- [x] `veri:health`'s document names the health-report source shape concretely enough that two sweeps a month apart are comparable
- [x] Every `requires:` entry names a tool that exists, or the method is honest that the skill is blocked on [[REQ-041]]
- [x] Each document's handoff names the next gate and the skill that staffs it, closing the loop back to the front half: did-it-work hands to evidence-intake, and health hands to wayfinder
- [x] The [[WO-130]] corpus cases for these three are consistent with the `description:` text as authored

## Receipts

- 2026-08-27 — fc60c6e — veri/methods/plan-work.md, veri/methods/did-it-work.md, veri/methods/health.md, veri/ids, skills/trigger-corpus.yaml — MET-007 veri:plan-work, MET-008 veri:did-it-work and MET-009 veri:health authored as drafts under the six-section template, completing the nine default skills; requires: lists (file_work_order/amend_document/search/get_neighbors/run_check; file_source/get_document/get_neighbors/get_receipts/run_check; run_check/list_documents/get_queue/get_receipts/file_source) all verified present in packages/mcp/src/server.ts by inspection, with three capability gaps stated rather than routed around (binds: paths: has no file_work_order parameter; file_requirement carries no kind or outcome; no MCP path to a requirement status flip, which did-it-work records as a correct boundary rather than a gap); TC-021's rationale corrected where the authoring showed abandoned claims are already detected by the stale-claim advisory; bodies run 229/226/228 lines, a few over SRC-063's 220 ceiling, and descriptions 186/188/185 words; 857 tests green across the workspace, veri check 0 issues and 17 advisories, unchanged from before the session.
