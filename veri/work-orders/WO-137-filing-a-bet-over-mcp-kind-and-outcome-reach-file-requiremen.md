---
id: WO-137
type: work-order
title: "Filing a bet over MCP: kind and outcome reach file_requirement"
status: backlog
created: 2026-08-28
updated: 2026-08-28
links:
  - id: REQ-032
    rel: implements
  - id: REQ-008
    rel: constrained-by
  - id: DEC-098
    rel: constrained-by
  - id: REQ-040
    rel: relates-to
  - id: REQ-041
    rel: relates-to
  - id: REQ-033
    rel: relates-to
binds:
  paths:
    - packages/core/src/create.ts
    - packages/mcp/src/writeback.ts
    - packages/mcp/src/server.ts
  tests:
    - packages/core/src/create.test.ts
    - packages/mcp/src/writeback.test.ts
    - packages/mcp/src/server.e2e.test.ts
---

## Summary

A requirement filed over MCP cannot be a hypothesis. `file_requirement` takes title, body, acceptance criteria and links; its zod schema is `.strict()`, so nothing else passes, and `createDocument` refuses a `kind` argument for any type but `source` (`packages/core/src/create.ts:120`). There is no path for `outcome: {metric, target}` at all.

Every bet filed through the tool surface therefore lands as `kind: constraint` — the default when the field is absent ([[REQ-032]]). A constraint never raises [[REQ-033]]'s untested-bet advisory, so the loop that would later ask whether the bet paid off never opens. That is the laundering of assumption into fact that [[REQ-032]], [[REQ-033]] and [[DEC-113]] exist to prevent, arriving through the tool surface instead of through conversation.

Found while authoring the skill library's method documents (WO-133). It bites hardest on `veri:product-discovery` and `veri:define` — the two gates whose entire product is a well-typed hypothesis with a declared metric and target. Both currently work around it: they file the requirement, then show the exact frontmatter block and apply it as an ordinary file edit. The workaround is honest — it names the gap rather than routing around it — but it is a workaround, and it puts the field that makes a bet a bet outside the validated write path.

## In scope

- `createDocument` accepts `kind: constraint | hypothesis` for requirements, validated against the same vocabulary the schema enforces, so a bad value throws before an id is consumed — the posture `kind` already has for sources ([[REQ-038]])
- `createDocument` accepts an `outcome: {metric, target}` block for requirements and serializes it into frontmatter in the canonical shape the parser round-trips
- `fileRequirement` carries both through, composing nothing new — the [[DEC-098]] shape, where filers compose sections and creation owns frontmatter
- The `file_requirement` MCP tool exposes `kind` and `outcome` on its strict schema, described so an agent knows a hypothesis without a declared metric is incomplete, not merely terse
- Filing stays born-`draft` and unstamped ([[REQ-008]]); the new fields say what kind of claim it is, never whether it binds
- Tests: a hypothesis filed over MCP lands with kind and outcome in frontmatter and reloads as a hypothesis; a hypothesis filed with no outcome still lands, and `veri check` reports it; an unknown kind is refused before the id is consumed; a constraint (or an absent kind) is byte-identical to what the tool writes today
- Once it lands, the workaround passages in `veri/methods/product-discovery.md` and `veri/methods/define.md` collapse to the ordinary filing beat

## Out of scope

- Relaxing `check`'s `hypothesis-without-outcome` rule. Filing a hypothesis with no metric must stay visible; the point of this work is that the metric becomes fileable, not that its absence becomes quiet
- Making `outcome` mandatory on a hypothesis at the schema or tool layer. A half-drafted hypothesis parses today by design, and `check` is where that judgment lives
- Amending [[REQ-032]] or [[REQ-041]]. Both are accepted; whether this gap becomes a sixth item on REQ-041 is the user's call, recorded below as an open question
- The `superseded_by` flip. `amend_document` refuses an active decision and no write tool carries a status field, so superseding a decision has no MCP path either — a real gap, but one that touches a binding document rather than a draft, and it deserves its own work order rather than a ride on this one. `veri/methods/decide.md` documents the two-line manual edit meanwhile
- `kind` on any other type. Sources already have theirs; nothing else in the schema takes one
- The amend path. Setting kind or outcome on an already-filed draft is `amend_document`'s question, and it accepts no frontmatter fields beyond title and links today

## Requirements

- [[REQ-032]] — implements
- [[REQ-008]] — constrained-by
- [[DEC-098]] — constrained-by
- [[REQ-040]] — relates-to
- [[REQ-041]] — relates-to
- [[REQ-033]] — relates-to

## Open question for the user

[[REQ-041]] ("The MCP surface carries what lifecycle skills need") already collects gaps of exactly this class, and is accepted — so adding a sixth item is an amendment for the user to approve, not an edit to make silently. Proposed wording, if wanted:

> 6. **Epistemic kind on filing** — `file_requirement` carries `kind` and the `outcome` block, so a skill that collected a metric and a target can file a hypothesis as one. Without it every bet filed over MCP lands as a constraint and never raises the untested-bet advisory.

This work order does not depend on that amendment; it links [[REQ-041]] as `relates-to` and can be re-linked `implements` if the item lands.

## Acceptance tests

- [ ] `file_requirement` over MCP with `kind: hypothesis` and `outcome: {metric, target}` writes both to frontmatter, and the document reloads with `requirementKind` reporting `hypothesis`
- [ ] The same filing with `kind: hypothesis` and no outcome succeeds and is reported by `veri check` as `hypothesis-without-outcome` — the rule still fires
- [ ] `kind: constraint`, and an omitted `kind`, produce the file the tool writes today, byte for byte
- [ ] An unknown kind is refused with a message naming the accepted values, and no REQ id is consumed
- [ ] `createDocument` still refuses `kind` on a work order and on a decision, and still validates a source's kind against `SOURCE_KINDS`
- [ ] The tool schema stays `.strict()` — an unknown key is still refused
- [ ] The filed document is `status: draft` with no `approved:` stamp, whatever its kind
- [ ] `veri check` reports zero issues across the repo after the change
- [ ] The workaround passages in `veri/methods/product-discovery.md` and `veri/methods/define.md` are replaced by the ordinary filing instruction, with no capability claimed that the tool does not have

## Receipts

(none yet)
