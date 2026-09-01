---
id: WO-144
type: work-order
title: "The work-order template sheds its Requirements section"
status: done
approved: 2026-09-01
claimed_by: fable-wo144
claimed_at: 2026-09-01
created: 2026-09-01
updated: 2026-09-01
links:
  - id: REQ-034
    rel: implements
  - id: REQ-010
    rel: constrained-by
  - id: SRC-066
    rel: derived-from
# binds:         # code this work order claims (optional)
#   paths: []    # repo-root-relative globs
#   tests: []    # test files proving it (path or path::name)
---

## Summary

SRC-066 measured the ## Requirements section across all 138 work orders: median 3 lines, and in the audited cases a verbatim restatement of the frontmatter links — zero information above what the frontmatter already binds, in a section the template mandates everywhere (this very work order will render one). The template drops it; frontmatter links carry the binding, as they already do for every check rule. The "run veri check, zero issues" boilerplate acceptance line (50 work orders carry it) leaves the template guidance too — it is a repo invariant, not a test of the work.

## In scope

- Remove ## Requirements from the built-in work-order template and this project's veri/templates/work-order.md
- Remove the section from file_work_order's composition so newly filed work orders stop growing it
- Drop the zero-issues boilerplate from template guidance and kickoff prompts (the bar stays in workflow rule 6, stated once)
- Update the site reference and how-veri-builds-veri walkthrough where they show the six-section skeleton

## Out of scope

- Editing the 138 existing work orders (missing-section follows the template, so nothing fires on documents that still carry the section)
- Any frontmatter change (links are untouched; they are the binding)
- The other five sections

## Requirements

- [[REQ-034]] — implements
- [[REQ-010]] — constrained-by
- [[SRC-066]] — derived-from

## Acceptance tests

- [x] A newly filed work order has five sections and no Requirements heading (WORK_ORDER_BODY in packages/core/src/templates.ts; verified live — `veri new work-order` in a fresh scaffold renders Summary, In scope, Out of scope, Acceptance tests, Receipts; commands.test.ts asserts the five and the absence)
- [x] checkStructure derives expectations from the updated template and flags nothing on old documents that still carry the section (repo check stays at 0 issues · 14 advisories with all 138 old work orders untouched; the five-issues fixture's advisory count dropped 14 → 12 exactly by the two missing-Requirements advisories)
- [x] file_work_order output contains no Requirements section (writeback.ts composes without it; writeback.test.ts wire test asserts no `## Requirements` and the binding riding frontmatter links)
- [x] Site reference shows the five-section skeleton (site/docs/reference.html Templates list; the how-veri-builds-veri walkthrough never rendered the skeleton, so nothing fired there)
- [x] Full suite green (930 tests across action, cli, core, mcp, ui — 0 failures)

## Receipts

- 2026-09-01 — 440993f — Dropped the Requirements section from the built-in and project work-order templates, file_work_order's composition, and the site reference, and the zero-issues bar restatement from the entry-file guidance; suite green, check at baseline.
