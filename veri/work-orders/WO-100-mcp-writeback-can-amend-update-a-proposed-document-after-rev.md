---
id: WO-100
type: work-order
title: "MCP writeback can amend: update a proposed document after review feedback"
status: in-progress
claimed_by: claude-555dab1c
claimed_at: 2026-08-25
approved: 2026-08-25
created: 2026-08-25
updated: 2026-08-25
links:
  - id: SRC-046
    rel: derived-from
  - id: REQ-003
    rel: implements
  - id: REQ-006
    rel: constrained-by
  - id: REQ-008
    rel: constrained-by
  - id: DEC-076
    rel: constrained-by
---

## Summary

An MCP surface for revising an existing unapproved document — a triage agent files a work order, the user reviews and asks for changes, and today the agent must fall back to raw file edits because the `file_*` tools only create. Finding F3 of [[SRC-046]], re-scoped: the original finding (filing drops the body) is already fixed — `file_work_order` now persists scope sections, acceptance tests, and links in one call, verified against [[WO-098]] as filed. The residual gap is the iterate half of the triage loop: propose → review → revise belongs on the same validated, schema-checked path as propose.

## In scope

- An update tool (or update mode on the `file_*` tools — shape filed as a proposed decision) that revises titles, bodies, sections, and links of an existing document by id, validated against the same schema rulebook as creation ([[REQ-006]]).
- Hard guardrails honoring the approval boundary of [[REQ-008]]: the tool refuses to touch approved/active documents, refuses status promotions, and never writes `approved:` stamps — amendment is for draft/proposed/backlog documents only.
- `updated:` frontmatter maintained per [[DEC-076]]; receipts remain append-only via the existing receipt tool.
- Tool description makes the contract explicit to agents: create, amend-while-unbinding, never promote.

## Out of scope

- Any path that edits approved or active documents over MCP — those changes remain deliberate human/git acts.
- Deleting or renumbering documents over MCP.
- Batch or multi-document edits.
- UI for reviewing amendments (the existing app diff/review surfaces cover it).

## Requirements

- [[SRC-046]] — derived-from
- [[REQ-003]] — implements
- [[REQ-006]] — constrained-by
- [[REQ-008]] — constrained-by
- [[DEC-076]] — constrained-by

## Acceptance tests

- [ ] An agent can revise an unapproved work order's scope sections, acceptance tests, and links by id in one call, and the result is schema-valid on disk.
- [ ] Amending an approved or active document is refused with a clear error naming the approval boundary.
- [ ] A status promotion or `approved:` stamp attempted through the tool is refused.
- [ ] `updated:` reflects the amendment date; `created:` and id are untouched.
- [ ] The tool-shape choice (dedicated update tool vs. upsert mode) is filed as a proposed decision with rejected alternatives.
- [ ] `veri check` passes; tests colocated per repo convention.

## Receipts

(none yet)
