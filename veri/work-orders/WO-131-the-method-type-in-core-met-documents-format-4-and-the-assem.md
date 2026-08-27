---
id: WO-131
type: work-order
title: "The method type in core — MET- documents, format 4, and the assembly menu"
status: done
claimed_by: opus-wo131
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
# binds:         # code this work order claims (optional)
#   paths: []    # repo-root-relative globs
#   tests: []    # test files proving it (path or path::name)
---

## Summary

The seventh document type, per [[DEC-130]]. Nothing else in the skill library can proceed without it: a method document filed before this lands fails the discriminated union on `type: method` and `ID_RE` on `MET-`, so it does not parse, does not check, and cannot be approved.

The recipe is `f21a943` (the sixth type, `product`, under [[WO-121]]) followed step for step — 651 insertions across 29 files, a marker-only format bump, seeded drafts. This work order is that change with the shapes [[DEC-130]] specifies substituted in. Read `f21a943` before starting; it is the closest thing to a spec for the mechanical half.

Two departures from the product precedent are deliberate and must not be copied across: methods are an **open collection** (any file under `veri/methods/`, ids minted on demand — not gated singletons, so `create.ts` must *not* refuse generic creation the way it does for product), and their packing is **name-only**, not full.

## In scope

- `method` in `DOC_TYPES`, `MET` in `PREFIX_TO_TYPE` and `ID_RE`, and the idField error message in `schema.ts` updated to name the new prefix
- `methodSchema` in the discriminated union: workflow lifecycle (`draft | accepted | retired | withdrawn`), `approved`/`approved_by`, plus `description` (required, non-empty), `requires` (required, array of tool-name strings — may be empty for a skill needing none), and `upstream` (optional slug)
- `ASSEMBLY_POLICY.method = { include: 'always', packing: { mode: 'name-only' } }`, and the assembly change in `context.ts` that renders accepted methods as a menu — outside the traversal buckets, like the workflow and the product singletons, in a sanctioned reading position
- `method: { from: 'draft', to: 'accepted' }` in `approve.ts`'s `PROMOTION` table, and the refusal message at `approve.ts:70` updated to name methods
- `methods` added to `VERI_SUBDIRS` in `scaffold.ts`
- `BODY_TEMPLATES.method` — the six sections [[DEC-130]] names: Purpose, What it reads, The interview, What it files, Guardrails, Handoff
- `CURRENT_FORMAT` 3 → 4 with its migration step, marker-only: no existing document changes
- The `method-file` placement rule on the `product-file` pattern (`check.ts:422`): a method outside `veri/methods/`, and a non-method inside it
- `create.ts`, `parse.ts`, `pending.ts`, `report.ts`, `idstore.ts`, `types.ts`, `search.ts` and the other exhaustive-over-`DocType` sites — the compiler names them
- Compile-keeping map entries in the desktop app's renderer wherever the compiler demands one for a new document type, exactly as [[WO-121]] did — entries only, no surface

## Out of scope

- Authoring any method document content — that is the pathfinder work order and the two that follow it. This work order may seed at most a `.gitkeep`, not a draft method
- The shell emitter, `veri skills install`, and `veri skills upgrade`
- The shell-drift advisories — a separate work order, in the host-fed tier
- Any method surface in the desktop app beyond what the compiler demands. That package is design-gated by [[DEC-012]] and needs a design document first, so this work order deliberately names no gated path and declares none: a `binds.paths` declaration without a `designed-by` link is an issue, not an advisory ([[DEC-114]])
- Reading or validating `requires:` against an actual MCP tool list. Core cannot know the MCP surface without inverting the dependency direction; the server validates its own tool names

## Requirements

- [[DEC-130]] — implements
- [[REQ-040]] — implements
- [[DEC-125]] — constrained-by
- [[SRC-060]] — derived-from

## Acceptance tests

- [x] A `veri/methods/*.md` fixture with `type: method`, `MET-001`, a `description`, and a `requires` list parses, checks clean, and round-trips byte-identically
- [x] A method missing `description`, or with an empty one, is an invalid-frontmatter issue — not a silently absent field, since the emitter would otherwise write a shell that triggers on nothing
- [x] `MET-001` with `type: workflow` (or any mismatch) fails the id-prefix superRefine like every other type
- [x] `veri approve MET-001` flips `draft` → `accepted` and stamps `approved:`; a `retired` method refuses with "nothing to approve"
- [x] An accepted method appears in an assembled context package as a name-only menu row; a `draft` and a `retired` method do not
- [x] The menu adds no more than a bounded number of tokens for fourteen methods — asserted numerically, since [[DEC-130]] chose name-only precisely to hold this cost
- [x] A method file outside `veri/methods/`, and a non-method file inside it, each raise the `method-file` violation
- [x] A format-3 project migrates to 4 with no content change; a format-4 project read by a format-3 reader reports the format, not invalid frontmatter
- [x] `veri check` on this repo: 0 issues

## Receipts

- 2026-08-27 — 5fb8119 — packages/core/src/ids.ts, packages/core/src/idstore.ts, packages/core/src/schema.ts, packages/core/src/parse.ts, packages/core/src/types.ts, packages/core/src/pending.ts, packages/core/src/check.ts, packages/core/src/context.ts, packages/core/src/approve.ts, packages/core/src/create.ts, packages/core/src/templates.ts, packages/core/src/scaffold.ts, packages/core/src/format.ts, packages/core/src/search.ts, packages/core/src/method.test.ts, packages/core/src/approve.test.ts, packages/core/src/format.test.ts, packages/core/src/scaffold.test.ts, packages/mcp/src/init.test.ts, packages/ui/src/renderer/sidebar.ts, packages/ui/src/renderer/theme.ts, packages/ui/src/renderer/views/templates.ts, action/dist/index.js, veri/format, veri/ids, veri/methods/.gitkeep, veri/decisions/DEC-135-generic-method-creation-writes-a-placeholder-description-rat.md — the seventh type: MET- ids, the method schema with required description/requires and optional upstream, the always/name-only gate menu in assembly, the draft→accepted promotion, the method-file placement rule, the methods collection in the scaffold, and CURRENT_FORMAT 4 with its marker-only migration; DEC-135 filed proposed for the placeholder description generic creation writes; 857 tests green across the five suites, check 0 issues
