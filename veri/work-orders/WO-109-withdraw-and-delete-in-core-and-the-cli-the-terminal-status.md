---
id: WO-109
type: work-order
title: "Withdraw and delete in core and the CLI — the terminal status, the guarded removal, and the format bump"
status: in-progress
claimed_by: claude-withdraw-delete
claimed_at: 2026-08-26
approved: 2026-08-26
created: 2026-08-26
updated: 2026-08-26
links:
  - id: DEC-110
    rel: implements
  - id: REQ-006
    rel: implements
  - id: REQ-008
    rel: relates-to
  - id: WO-104
    rel: depends-on
  - id: DEC-037
    rel: constrained-by
  - id: DEC-100
    rel: constrained-by
  - id: DEC-002
    rel: constrained-by
# binds:         # code this work order claims (optional)
#   paths: []    # repo-root-relative globs
#   tests: []    # test files proving it (path or path::name)
---

## Summary

Deliver the discard verbs in core and on the terminal surface, per [[DEC-110]]. Core gains `withdrawn` as a terminal status for all four document types and a guarded `deleteDocument` that refuses anything approved or referenced; the CLI exposes both as `veri withdraw <id>` and `veri delete <id>`. Withdrawn documents drop out of context packages, `veri next`, and the queues, while their ids stay issued and their inbound `[[ID]]` links keep resolving. The status enum addition ships with the on-disk format bump [[WO-104]] establishes as the rule, so a stale packaged app refuses the project with the REQ-015 statement instead of silently dropping withdrawn documents and misreporting every reference to them as broken.

## In scope

- `withdrawn` added as a terminal status for requirement, decision, work-order, and source in the core schema (packages/core), accepted by the parser and the status validator, and requiring no `approved:` stamp
- A pure `withdrawDocument(id)` in core: rewrites `status:` and `updated:`, byte-preserving the rest of the file, following the whole-file-update seam ([[DEC-100]])
- A pure `deleteDocument(id)` in core that refuses with a typed reason unless the document has never carried an `approved:` stamp AND no other document references it — neither in frontmatter `links:` nor as an inline `[[ID]]`
- Exclusion of withdrawn documents from context package assembly, `veri next`, the ready/backlog queue, and the approval queue; inbound links to them still resolve and never count as broken
- `veri withdraw <id>` and `veri delete <id>` in packages/cli, both printing the exact change before making it; `veri delete` prints the blocking reason and exits 1 when the guard refuses
- Both verbs added to the CLI usage block
- The `CURRENT_FORMAT` bump and `veri migrate` step for the status-enum addition, per WO-104's release rule (coordinate with WO-104 — one bump, not two)
- `veri list` showing withdrawn documents with their status, and `veri check` treating withdrawn as terminal (never pending, never gated)
- Colocated `*.test.ts` coverage for the schema addition, both core functions, the guard's refusal paths, and the assembly exclusions
- AGENTS.md's status lines updated to name `withdrawn`

## Out of scope

- Any change to the desktop app package — the app affordance is its own work order ([[WO-110]]) and stops at the design gate ([[DEC-012]], WF-001 rule 7). The path is deliberately not spelled literally here: the gate's v1 heuristic matches body text, so naming it would read this exclusion as a claim to touch it ([[WO-112]])
- An MCP writeback tool for either verb — agents do not get a destructive verb in this change
- Un-withdrawing, restoring a deleted file, or any trash/undo layer — git is the undo ([[DEC-002]])
- Recovering the id of a deleted document; `veri/ids` stays a high-water floor ([[DEC-037]])
- Cascading withdraw to documents that link to the withdrawn one
- Editing REQ-008's non-goal text — the narrowing is stated in DEC-110 and is the user's to fold in
- Bulk withdraw or delete

## Requirements

- [[DEC-110]] — implements
- [[REQ-006]] — implements
- [[REQ-008]] — relates-to
- [[WO-104]] — depends-on
- [[DEC-037]] — constrained-by
- [[DEC-100]] — constrained-by
- [[DEC-002]] — constrained-by

## Acceptance tests

- [x] A document of each of the four types parses and validates with `status: withdrawn`, and needs no `approved:` stamp to reach it
- [x] `veri withdraw DEC-xxx` rewrites only `status:` and `updated:`; the rest of the file is byte-identical
- [x] A withdrawn requirement linked by an in-progress work order does not gate it, and does not appear in that work order's context package
- [x] A withdrawn work order never appears in `veri next`, even when it carries an `approved:` stamp
- [x] An inline `[[ID]]` pointing at a withdrawn document is not reported as a broken link by `veri check`
- [x] `veri delete WO-xxx` removes an unapproved, unreferenced document and leaves `veri/ids` unchanged; the next `veri new` skips the freed id
- [x] `veri delete` refuses with exit 1 and a named reason when the document carries an `approved:` stamp
- [x] `veri delete` refuses with exit 1 and names the referrer when another document links to it in frontmatter, and again when only an inline `[[ID]]` mentions it
- [x] A project at the new format opened by a pre-bump core is refused with the REQ-015 format statement rather than opened
- [x] `veri migrate` takes a pre-bump project to the new format with no document rewrites
- [x] `veri check` reports zero violations across the repo after a withdraw and after a delete

## Receipts

### 2026-08-26 — withdraw and delete land in core and the CLI

Files: `packages/core/src/discard.ts` (new), `packages/core/src/discard.test.ts` (new),
`packages/core/src/schema.ts`, `packages/core/src/pending.ts`, `packages/core/src/check.ts`,
`packages/core/src/context.ts`, `packages/core/src/drift.ts`, `packages/core/src/save.ts`,
`packages/core/src/format.ts`, `packages/core/src/index.ts`, `packages/cli/src/commands.ts`,
`packages/cli/src/cli.ts`, `veri/format`, `AGENTS.md`, plus the format/scaffold/CLI test
updates and the rebuilt `action/dist/index.js`.

`withdrawn` joins the status enum of all four types; `withdrawDocument` flips
status and updated alone, `deleteDocument` refuses anything approved or
referenced via `deleteRefusal`. Withdrawn documents leave context packages,
the work-order gates, the design gate, and drift, while their inbound
`[[ID]]` links keep resolving. `CURRENT_FORMAT` is 2 with a marker-only 1→2
migration, and this project is migrated: the shipped Veri.app 0.2.1 core now
answers "this project uses veri format 2 … update Veri to open it" instead of
dropping documents and misreporting their references — WO-104's remedy,
spent here rather than twice.

Verified: `npm test` 722 tests across five workspaces, 0 failures;
`npm run typecheck` clean; `veri check` 0 issues (10 pre-existing advisories).
