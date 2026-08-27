---
id: WO-133
type: work-order
title: "The front-half default methods — wayfinder, product-discovery, evidence-intake, define, decide"
status: in-progress
claimed_by: opus-wo133
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
  - id: WO-132
    rel: depends-on
  - id: WO-130
    rel: consistent-with
# binds:         # code this work order claims (optional)
#   paths: []    # repo-root-relative globs
#   tests: []    # test files proving it (path or path::name)
---

## Summary

Five method documents covering the gates from a vague utterance to an approved decision: `veri:wayfinder`, `veri:product-discovery`, `veri:evidence-intake`, `veri:define`, `veri:decide`.

The split from the back half is [[DEC-128]]'s seam, not an arbitrary one. [[DEC-128]] found that Veri **structurally cannot** prove the front half on itself — its thesis is fixed by [[DEC-111]] and it has no discovery work left — so these five are exactly the ones the external greenfield exists to exercise. Authoring them together keeps the set the proving ground will judge in one reviewable unit.

These are also the five with the least existing canon to lean on. [[WF-001]] tells an implementer what to do; nothing in the repo tells anyone how to run a discovery interview. Expect this work order to be the hardest of the three authoring sessions, and expect it to lean on [[WO-132]]'s form notes rather than re-deciding the form.

## In scope

- Five method documents under `veri/methods/`, status `draft`, each complete under the template and each carrying `description:`, `requires:`, and `upstream:`
- `veri:wayfinder` is read-only and must say so in its guardrails: it routes to a gate, it does not file. It is the front door [[REQ-040]] names by example ("what should I work on next?", "why did we build this this way?"), so its `description:` is the one most load-bearing for triggering
- `veri:evidence-intake` staffs the evidence door and must carry the `tests`/`supports`/`refutes` and `outcome-of` link discipline of [[REQ-033]] and [[DEC-113]] concretely — this is the skill that closes [[WF-001]]'s loop, and the loop has never actually run on this project ([[SRC-062]])
- `veri:define` must push until acceptance criteria are observable **or** the requirement's kind flips to `hypothesis` with a declared metric and target ([[REQ-032]]). A skill that lets a vague requirement through has staffed its gate badly
- `veri:decide` must force real alternatives with recorded rejection reasons, and file `proposed` only
- Near-miss disambiguation in each `description:` consistent with [[WO-130]]'s corpus: `define`/`decide` and `product-discovery`/`user-discovery` both fall in this set

## Out of scope

- The back-half defaults (`plan-work`, `did-it-work`, `health`) and every advanced skill
- Re-deciding the authoring form. [[WO-132]] settled it; a disagreement with it is a conversation, not a silent divergence
- Promoting anything to `accepted`
- Building the discovery coaching against a real external project. That is [[DEC-128]]'s proving ground and comes after these exist
- Adding or changing MCP tools. Where a skill needs a capability [[REQ-041]] names but the server lacks, the method's `requires:` states it and the skill refuses per [[DEC-125]] — it does not degrade, and this work order does not close the gap

## Requirements

- [[DEC-130]] — implements
- [[REQ-040]] — implements
- [[DEC-125]] — constrained-by
- [[DEC-128]] — constrained-by
- [[SRC-060]] — derived-from
- [[WO-132]] — depends-on
- [[WO-130]] — consistent-with

## Acceptance tests

- [ ] All five parse, raise no `missing-section` advisory, and `veri check` reports 0 issues
- [ ] Every `requires:` entry names a tool that exists in the MCP server's current list, or the method is honest that the skill is blocked on [[REQ-041]] — no method claims a capability the surface does not have
- [ ] Each document's guardrails state that it files `draft`/`proposed` only and never stamps `approved:`
- [ ] Each document's handoff names the gate that comes next and the skill that staffs it: product-discovery hands to define, define hands to decide
- [ ] Two of the five are deliberately not links in that chain, and their documents say so. `veri:wayfinder` routes into any gate — it is the front door, not a stage. `veri:evidence-intake` feeds every stage rather than occupying one ([[SRC-060]]), so its handoff is conditional on what the evidence bears on: did-it-work when it answers a shipped bet, define or decide when it demands revised intent. A method that forces either into a single successor has mis-stated its gate
- [ ] `veri:wayfinder`'s document contains no artifact-creating step at all — verified by reading its "What it files" section, which should say it files nothing
- [ ] The [[WO-130]] corpus cases for these five are consistent with the `description:` text as authored; any case the authoring proves wrong is corrected in the corpus with its rationale line updated

## Receipts

(none yet)
