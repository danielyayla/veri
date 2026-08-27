---
id: WO-132
type: work-order
title: "The pathfinder method document — veri:implement authored end to end, establishing the form"
status: done
claimed_by: opus-wo132
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
  - id: SRC-060
    rel: derived-from
  - id: WO-131
    rel: depends-on
  - id: WO-130
    rel: consistent-with
  - id: SRC-063
    rel: delivers
# binds:         # code this work order claims (optional)
#   paths: []    # repo-root-relative globs
#   tests: []    # test files proving it (path or path::name)
---

## Summary

One method document, authored completely, before the other thirteen exist. `veri:implement` is the right one to go first: its content is the least speculative in the library — [[WF-001]]'s implementer rules are already written and already enforced — so the session's attention goes to *the form of a method document* rather than to inventing coaching from scratch.

What this work order really delivers is the answer to questions the schema cannot settle: how long a method document is, how the interview is written down so an agent can actually run it, how much of [[WF-001]] a method restates versus links, and what a `description:` looks like when it has to carry near-miss disambiguation and still read as prose. Thirteen documents authored against a form nobody has tried is thirteen documents to redo.

Sequenced after [[WO-131]] because a method document does not parse until the type exists, and best read alongside [[WO-130]]'s corpus, which states the gate boundary this document must hold.

## In scope

- `veri/methods/implement.md` — `MET-001`, status `draft`, complete under the six-section template
- A `description:` carrying the `plan-work`/`implement` near-miss [[WO-130]] names, phrased as matched text rather than as documentation about the skill
- A `requires:` list naming the MCP tools the skill genuinely cannot run without — `get_context`, `start_work_order`, `file_receipt` at minimum. Anything listed here becomes a refusal condition per [[DEC-125]], so list what breaks the skill, not what would be nice
- An `upstream:` slug, since this document ships with Veri and must be upgradable
- The **form notes**: a short written record of the authoring conventions this document establishes — length, how the interview is transcribed, restate-versus-link — committed where the next two work orders will read it. This is the transferable output; without it the form is re-derived thirteen times
- Any correction to `veri/templates/method.md` the attempt proves necessary. Discovering the six sections are wrong is a success of this work order, not a failure of [[DEC-130]]

## Out of scope

- The other thirteen method documents
- Emitting a shell for this method, or any part of the emitter
- Promoting the document to `accepted`. It lands `draft` like everything else ([[REQ-008]], [[DEC-111]]) — and under [[DEC-130]] a draft method emits no shell, so nothing triggers on it until the user stamps it
- Rewriting [[WF-001]]. If authoring exposes a gap in the workflow document, say so and stop; that is a separate change to approved canon
- Changing the `method` schema. If a required field turns out to be wrong, file a proposed decision per [[WF-001]] rule 4 rather than editing the type in flight

## Requirements

- [[DEC-130]] — implements
- [[REQ-040]] — implements
- [[DEC-125]] — constrained-by
- [[SRC-060]] — derived-from
- [[WO-131]] — depends-on
- [[WO-130]] — consistent-with

## Acceptance tests

- [x] `veri/methods/implement.md` parses, raises no `missing-section` advisory, and `veri check` reports 0 issues
- [x] The document's guardrails section states, explicitly, that the skill never writes an `approved:` stamp ([[REQ-008]], [[DEC-111]], and design principle 1 of [[SRC-060]])
- [x] Its handoff section names which documents await which gate afterwards, and which skill picks them up — design principle 3 of [[SRC-060]], and the property that makes the library a loop rather than fourteen tools
- [x] Every tool named in `requires:` exists in the MCP server's current tool list, verified by inspection and recorded in the receipt
- [x] The `description:` distinguishes this skill from `plan-work` in the text a trigger would actually match, and the corresponding [[WO-130]] near-miss cases are consistent with it
- [x] The form notes exist and are specific enough that a different session could author the next method without re-reading this one's full text

## Receipts

- 2026-08-27 — 3595029, 52ac404 — veri/methods/implement.md, veri/sources/SRC-063-form-note-how-a-veri-method-document-is-authored-established.md, veri/ids, veri/work-orders/WO-132-the-pathfinder-method-document-veri-implement-authored-end-t.md — MET-001, the veri:implement method authored end to end under the six-section template (draft, upstream veri/implement, a 180-word description carrying the plan-work near miss as matched text); requires: get_context, start_work_order, file_decision, file_receipt, run_check — all five verified present in packages/mcp/src/server.ts by inspection, and get_queue and amend_document deliberately omitted as non-blocking; SRC-063 records the authoring form for WO-133 and WO-134; the method template needed no correction; 371 tests green, veri check 0 issues and 17 advisories, unchanged from before the session
