---
id: WO-021
type: work-order
title: Default workflow document and harness pointer files
status: in-progress
created: 2026-08-12
updated: 2026-08-12
links:
  - id: DEC-018
    rel: constrained-by
  - id: DEC-002
    rel: constrained-by
  - id: DEC-006
    rel: constrained-by
  - id: DEC-016
    rel: constrained-by
  - id: REQ-001
    rel: extends
  - id: REQ-003
    rel: extends
  - id: REQ-006
    rel: extends
  - id: REQ-008
    rel: extends
---

## Goal

New projects and new users should inherit an opinionated workflow —
sources → requirements/decisions → work orders → implementation →
receipts — without designing it themselves, and every AI harness
should receive it through one channel instead of per-harness copies.
Per [[DEC-018]]: the workflow is a first-class document at
`veri/workflow.md`, delivered as the first section of every context
package; harness entry files become generated pointers.

## In scope

- **Core document model**: add `workflow` as a document type
  (`type: workflow`, statuses `draft → accepted → retired`, id
  `WF-001`) to parsing, schemas ([[REQ-006]]), and `veri check`.
  The approval gate ([[REQ-008]]) applies unchanged.
- **Default workflow content**: author the opinionated default
  `workflow.md` — the harness-neutral method currently embedded in
  this repo's `CLAUDE.md` (work order first, read linked docs in
  full, respect decisions, scope discipline, file decisions as
  proposed, receipts, `veri check` before done), with no mention of
  any specific harness or model.
- **Scaffold**: `scaffoldProject` ([[DEC-016]]) writes the default
  `veri/workflow.md` in both empty and demo scaffolds, plus pointer
  files at the project root: `AGENTS.md` (the pointer text) and
  `CLAUDE.md` (a one-line deferral to AGENTS.md). Pointer files never
  clobber existing ones (same `COPYFILE_EXCL` posture as DEC-007).
- **Context assembly**: `packages/mcp/src/context.ts` renders the
  project's workflow document (when present) as the first section of
  the package, replacing the root `CLAUDE.md` read. Pending (draft)
  workflow documents follow the existing REQ-008 labeling: visible,
  marked non-binding.
- **This repo eats its own scaffold**: split the workflow half of
  Veri's own `CLAUDE.md` into `veri/workflow.md`; keep
  repo-specific code conventions where they are.
- Tests: core type/schema/check coverage, scaffold output, and
  context-assembly ordering.

## Out of scope

- Multiple workflows per project, or a `veri/workflows/` directory.
- A `veri agents` command to (re)generate pointer files for
  additional harnesses — later work order if wanted.
- Editor-specific rule files (`.cursor/rules`, etc.).
- Any `packages/ui` change (no design document; DEC-012).
- Migration tooling for existing projects beyond this repo.

## Acceptance criteria

- [ ] `veri check` passes on a scaffolded project containing the
      default `workflow.md` and on this repo after the split.
- [ ] A scaffolded project's context package opens with the workflow
      section; a project without one omits it (no failure).
- [ ] `AGENTS.md` and `CLAUDE.md` pointers are written on scaffold
      and never overwrite existing files.
- [ ] The default workflow text names no harness, vendor, or model.
- [ ] Approval gate applies: a draft workflow renders with the
      pending label in packages.

## Receipts
