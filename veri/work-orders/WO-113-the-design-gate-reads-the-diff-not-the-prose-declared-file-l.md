---
id: WO-113
type: work-order
title: "The design gate reads the diff, not the prose — declared file lists replace mention matching"
status: backlog
created: 2026-08-26
updated: 2026-08-26
links:
  - id: REQ-006
    rel: implements
  - id: DEC-039
    rel: implements
  - id: REQ-002
    rel: relates-to
  - id: DEC-012
    rel: relates-to
  - id: DEC-040
    rel: relates-to
  - id: DEC-081
    rel: relates-to
  - id: WO-112
    rel: relates-to
# binds:         # code this work order claims (optional)
#   paths: []    # repo-root-relative globs
#   tests: []    # test files proving it (path or path::name)
---

## Summary

The design gate asks whether a work order's body text contains a `design_gate_path` ([[DEC-039]], packages/core/src/check.ts) — the v1 heuristic, and it is wrong in both directions. False positives: prose that names a path without touching it. [[WO-112]] cured the worst case, an `## Out of scope` exclusion, but the same misread survives in receipts, rationale, and comparisons — that work order's own receipt tripped the gate while describing a commit that touched no app file. False negatives are the graver half and untouched: a work order that edits the app and never spells the path out passes cleanly, which means today's gate protects against forgetting to mention the app, not against skipping the design.

Deliver a gate that reads what the work actually claims or touches instead of how it is written about. Two candidate sources exist and they answer different questions: the `binds: paths:` frontmatter a work order already declares, which is available before the work starts — when the gate must fire — and the git diff of the commits its receipts cite, which is available only afterwards but catches a work order that declared nothing and quietly touched the app. They are complements, not rivals, and the split between them is an architectural question this repo has already answered once for provenance ([[DEC-040]]: pure core over host-collected git facts) under a constraint that binds here too — over MCP the git tier is out of reach ([[DEC-081]]), so a gate that lives only in git is a gate agents cannot self-check against.

Settle that split in a proposed decision before writing code, then build to it.

## In scope

- A proposed decision recording where the gate's evidence comes from: declared `binds: paths:` as the pure, pre-flight tier; git-diff evidence as a host-collected tier if it is kept at all; and what happens to mention matching — retired, or demoted to an advisory that catches the honest cases the declaration misses
- `checkDesignGate` reworked to that decision, staying pure and subprocess-free so `veri check`, `run_check` over MCP, and the app all reach the same verdict
- The failure the current gate cannot see: a work order that touches a gated path while declaring nothing must not pass silently — whether that is an issue, an advisory, or a demand that gated work declare its binds is the decision's to make
- The issue message rewritten to name its evidence, so a maintainer reading it knows whether the gate read a declaration or a diff
- Migration for the work orders already in this repo: whatever the new rule is, the existing corpus must not light up with issues on documents that were correct under the old one
- Colocated `*.test.ts` coverage for both directions — the false positive and the false negative — and for a project that declares no `design_gate_paths`, where the gate stays inert
- WF-001 rule 7 and [[DEC-039]] updated to describe the trigger as it then works

## Out of scope

- Changing which paths are gated or the `design_gate_paths` frontmatter shape ([[DEC-039]])
- Changing what satisfies the gate — a `designed-by` link to an existing document ([[DEC-026]]'s note-style exemption included)
- Making `binds:` mandatory on all work orders; if declarations become the gate's evidence, the requirement lands on gated work only
- Reworking provenance, drift, or binding staleness, which read git for their own purposes
- Applying diff-based evidence to any other check
- Retroactively auditing closed work orders for gate verdicts they would fail under the new rule

## Requirements

- [[REQ-006]] — implements
- [[DEC-039]] — implements
- [[REQ-002]] — relates-to
- [[DEC-012]] — relates-to
- [[DEC-040]] — relates-to
- [[DEC-081]] — relates-to
- [[WO-112]] — relates-to

## Acceptance tests

- [ ] A proposed decision exists recording the evidence split and the fate of mention matching, and this work order links it
- [ ] A work order that declares a gated path in `binds: paths:` and links no `designed-by` document fails the gate
- [ ] A work order whose prose names a gated path it neither declares nor touches does not fail the gate
- [ ] A work order that touches a gated path without declaring it is reported — at the severity the decision sets, with a message naming what evidence was read
- [ ] A work order with a `designed-by` link to an existing document passes regardless of declarations or diffs; one whose `designed-by` target does not exist still fails
- [ ] With no `design_gate_paths` declared, the gate stays inert
- [ ] The gate reaches the same verdict from `veri check`, `run_check` over MCP, and the app — no tier sees a gate the others cannot
- [ ] `veri check` on this repo reports zero issues after the change, with no document edited solely to appease the new rule

## Receipts

(none yet)
