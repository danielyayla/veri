---
id: WO-148
type: work-order
title: "Every surface tells the truth — methods, README, and reference stop disagreeing with the code"
status: in-progress
approved: 2026-09-01
claimed_by: fable-wo148
claimed_at: 2026-09-01
created: 2026-09-01
updated: 2026-09-01
links:
  - id: REQ-019
    rel: implements
  - id: REQ-040
    rel: serves
  - id: REQ-012
    rel: serves
  - id: SRC-066
    rel: derived-from
# binds:         # code this work order claims (optional)
#   paths: []    # repo-root-relative globs
#   tests: []    # test files proving it (path or path::name)
---

## Summary

SRC-066 catalogued the drift: MET-008 states file_requirement carries no kind and no outcome while MET-005 and the server say the opposite (WO-137 landed the capability and one method missed the rewrite); methods carry hardcoded counts that are already wrong ("127 decisions", "123 work orders"); five handoff destinations name skills that do not exist; workflow rule 8's commit-subject form disagrees with the form the repo actually uses; the README claims ten MCP tools against nineteen shipped, points at hero images that do not exist, and says no Windows/Linux app exists while release.yml builds both; the site reference documents twelve tools. Stale instructions are context spent steering agents wrong — this is REQ-019's promise, enforced.

## In scope

- Correct MET-008's file_requirement claim; remove or date the hardcoded counts in decide.md and did-it-work.md
- Resolve every handoff to an unwritten skill: point review handoffs at MET-010 (WO-146), cut the routes to approval-session, archaeology, user-discovery, and onboard until they exist
- Align workflow.md rule 8's commit-subject form with the practiced one
- README: nineteen tools, real or removed hero images, platform paragraph matching release.yml; site reference lists all nineteen tools
- A drift test asserting the reference page names every tool the server registers, so the count cannot silently fork again

## Out of scope

- packages/ui (the connection panel's hardcoded four-tool list is real drift but design-gated; noted for a UI follow-up)
- Shortening the methods (WO-149 owns weight; this slice owns truth)
- Deleting corpus entries (WO-147 owns corpus integrity; coordinate, don't overlap)

## Requirements

- [[REQ-019]] — implements
- [[REQ-040]] — serves
- [[REQ-012]] — serves
- [[SRC-066]] — derived-from

## Acceptance tests

- [ ] No method document names a skill that lacks a MET document, and no method states a tool constraint the server contradicts
- [ ] decide.md and did-it-work.md carry no present-tense corpus counts
- [ ] README's tool count, images, and platform paragraph are verifiably true; the reference page lists every registered tool and a test enforces it
- [ ] workflow.md rule 8 matches the practiced commit-subject form
- [ ] Full suite green, veri check zero issues

## Receipts

(none yet)
