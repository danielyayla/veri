---
id: WO-138
type: work-order
title: "Supersession becomes a verb: the superseded_by flip over CLI and MCP"
status: done
claimed_by: opus-wo138
claimed_at: 2026-08-28
approved: 2026-08-28
created: 2026-08-28
updated: 2026-08-28
links:
  - id: REQ-008
    rel: constrained-by
  - id: DEC-110
    rel: constrained-by
  - id: REQ-040
    rel: relates-to
  - id: REQ-041
    rel: relates-to
  - id: WO-137
    rel: relates-to
binds:
  paths:
    - packages/core/src/supersede.ts
    - packages/core/src/index.ts
    - packages/cli/src/commands.ts
    - packages/cli/src/cli.ts
    - packages/mcp/src/server.ts
  tests:
    - packages/core/src/supersede.test.ts
    - packages/cli/src/commands.test.ts
    - packages/mcp/src/server.e2e.test.ts
---

## Summary

Reversing a decision is the record's most important move, and it is the one move no surface performs. A new decision is filed forward with a `supersedes` link — that part works — but flipping the old one to `status: superseded` with `superseded_by:` set has no path anywhere: `amend_document` covers only born-pending statuses (`packages/mcp/src/amend.ts:23`) and carries no status field, and there is no `veri supersede` verb in the CLI. Withdrawal has both a core function and a verb ([[DEC-110]]); supersession, its nearer neighbour, has neither.

The schema requires the pair — a superseded decision without `superseded_by` is invalid frontmatter (`packages/core/src/schema.ts:275`) — so a half-applied flip breaks `veri check` outright. Today `veri/methods/decide.md` documents the two-line manual edit and tells the session to show it or apply it as an ordinary file edit, which is honest and also the only thing it can say.

Worth naming precisely: the approval boundary is **not** what blocks this. `guardDocumentEdit` refuses id changes, `approved:` edits, and departures from a *pending* status; `active → superseded` passes it unguarded (`packages/core/src/save.ts:48`), which is why the desktop app's direct-edit save already performs the flip. What is missing is a first-class verb that writes both fields together, so the pair invariant cannot be half-satisfied, and so a skill can close a reversal without hand-editing frontmatter.

Found alongside [[WO-137]] while authoring the skill library's method documents (WO-133). The two are independent: WO-137 is additive filing of a draft, this one touches a binding document's status.

## In scope

- A core function — `supersedeDecision(veriDir, id, successorId)` or equivalent — on the `withdrawDocument` shape in `discard.ts`: load, validate, write `status: superseded` and `superseded_by:` in one edit, bump `updated:`, return the file it touched
- Refusal, with a message naming the remedy, when: the id is not a decision, the decision is not `active`, the successor id does not exist, the successor is not a decision, or a document is asked to supersede itself
- A `veri supersede <DEC-id> --by <DEC-id>` CLI verb over that function, in the `veri withdraw` idiom, listed in `USAGE`
- An MCP tool exposing the same function on a strict schema, described so an agent knows this is the forward-filed, backward-stamped half of a reversal
- Tests at every layer, including the refusals and the round trip — a superseded decision reloads with `supersededBy` set, `veri check` reports zero issues on it, and the `drift-superseded-link` detector sees it
- Once it lands, the workaround passage in `veri/methods/decide.md` ("Supersession is filed forward and stamped backward") collapses to the ordinary call

## Out of scope

- Any change to `guardDocumentEdit` or the approval boundary. The flip already passes the guard; this work adds a verb, it does not move a line
- A status field on `amend_document`. Amendment is the draft-revision path and stays that ([[REQ-008]]); supersession is its own act with its own preconditions
- Retirement (`accepted → retired` on a requirement) and any other status flip. Same shape, same missing verb, genuinely a sibling gap — and deliberately not bundled, because the successor-state question below is specific to decisions
- Undo. There is no un-supersede verb; reversing a reversal is another decision, filed forward
- The desktop app. `packages/ui` is a design-gated path ([[DEC-012]], WF-001 rule 7) and the app can already perform the flip through direct editing; surfacing a button is separate work behind its own design document
- Auto-superseding. Filing a decision with a `supersedes` link must not flip the target on its own — the flip stays an explicit act with an explicit successor

## Requirements

- [[REQ-008]] — constrained-by
- [[DEC-110]] — constrained-by
- [[REQ-040]] — relates-to
- [[REQ-041]] — relates-to
- [[WO-137]] — relates-to

## The fork to decide during implementation

Per WF-001 rule 4 this needs a proposed decision before the code settles, because the obvious implementation quietly picks a side:

**May the successor be a `proposed` decision?** The realistic sequence is that a skill files the replacement as `proposed`, the user approves it, and only then is the old one retired from authority. If `supersede` accepts a proposed successor, a session can leave a hole — the old decision dead, the new one not yet binding, and nothing in the graph governing that fork. If it refuses one, the verb enforces the ordering "approve the successor first," at the cost of a session having to come back after the stamp. `veri check` currently validates only that the successor id *exists* (`packages/core/src/check.ts:55`), so neither the hole nor the ordering is caught today.

The second, smaller fork rides along: whether an agent may run this at all, or whether it is the user's act. [[DEC-110]] ruled that withdrawal is not a promotion and needs no stamp, since abandonment claims no authority — but supersession *transfers* authority to a successor, which is a different claim. The proposed decision should say which of those two supersession resembles, and the answer determines whether the MCP tool exists at all or the CLI verb stands alone.

## Acceptance tests

- [x] `veri supersede DEC-A --by DEC-B` writes `status: superseded` and `superseded_by: DEC-B` in one edit, and `veri check` reports zero issues on the result
- [x] The same call over MCP produces the byte-identical file (or, if the fork above rules the act user-only, no MCP tool exists and the decision records why)
- [x] Superseding a `proposed`, `superseded`, or `withdrawn` decision is refused with a message naming the state it is in
- [x] Superseding a requirement, work order, or source is refused, naming the type
- [x] A successor id that does not exist, is not a decision, or is the document itself is refused, and nothing is written
- [x] A partially-applied flip is impossible: no path writes `status: superseded` without `superseded_by`, and the pair round-trips through `parseDocument` with `supersededBy` set
- [x] An in-progress work order linking the freshly superseded decision raises `drift-superseded-link`, unchanged
- [x] The fork above is filed as a `proposed` decision naming both alternatives, and nothing promotes it
- [x] `veri/methods/decide.md` describes the verb instead of the manual two-line edit, claiming no capability the surfaces do not have

## Receipts

- 2026-08-28 — 361b9af — packages/core/src/supersede.ts, packages/core/src/supersede.test.ts, packages/core/src/index.ts, packages/cli/src/commands.ts, packages/cli/src/cli.ts, packages/cli/src/commands.test.ts, packages/mcp/src/server.ts, packages/mcp/src/server.e2e.test.ts, veri/methods/decide.md, packages/cli/methods/decide.md, veri/decisions/DEC-140-supersession-requires-an-active-successor-which-is-what-make.md — supersedeDecision plus the pure supersedeRefusal in core, veri supersede --by, the supersede_decision MCP tool, and DEC-140 (proposed) settling the active-successor fork; 10 new tests, full suite 929 green, check 0 issues. One new advisory, and the right one: closing this work order makes REQ-040's work orders all done, so the untested-bet advisory now asks what reality said about the skill-library hypothesis — evidence for the user to judge, not a defect
