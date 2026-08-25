---
id: WO-108
type: work-order
title: "Sources entry-point refinement — shorter Import label, cross-linked create/import flows"
status: done
claimed_by: claude-import-entry
claimed_at: 2026-08-25
approved: 2026-08-25
created: 2026-08-25
updated: 2026-08-25
links:
  - id: REQ-031
    rel: implements
  - id: SRC-045
    rel: designed-by
  - id: DEC-109
    rel: constrained-by
# binds:         # code this work order claims (optional)
#   paths: []    # repo-root-relative globs
#   tests: []    # test files proving it (path or path::name)
---

## Summary

Implements DEC-109 on the file-import surface (SRC-045): the Sources panel's import button label shortens to "Import…" (accessible name unchanged), the New Source popover gains a secondary "or import files…" link opening the same picker → review-sheet flow, and the Sources empty state gains an import affordance beside the ghost "New Source…" row. Both header entry points stay; no `+` menu.

## In scope

- Shorten the Sources panel header button text from "Import files…" to "Import…"; keep `title`/`label` (accessible name) as "Import files".
- Add a secondary "or import files…" link inside the new-document popover when the type is `source`, wired to the existing `startImportPicker()` path; it must not appear for other document types.
- Add an import affordance to the Sources panel empty state, alongside the existing ghost "New Source…" row, wired to the same picker path.
- Matching styles in `packages/ui/renderer/styles.css` using existing tokens only.
- Update `design/file-import/README.md` entry-points/interaction notes to record the amended spec, and note the amendment in SRC-045.

## Out of scope

- Any `+` menu or change to `+` behavior in any type panel (rejected by DEC-109).
- Removing or relocating the header import button.
- Changes to the drag-and-drop path, the review sheet, or import logic (`importlogic.ts`, core/CLI seams).
- New colors or primitives beyond the shipped token set.

## Requirements

- [[SRC-045]] — designed-by
- [[DEC-109]] — constrained-by

## Acceptance tests

- [x] Sources panel header shows "Import…" and its accessible name remains "Import files".
- [x] New Source popover shows an "or import files…" link that opens the native picker into the review sheet; popovers for other types show no such link.
- [x] Sources empty state offers both "New Source…" and an import entry; empty states of other types are unchanged.
- [x] All entries converge on the existing review sheet — no new import flow.
- [x] UI test suite passes; `veri check` reports zero violations.

## Receipts

- 2026-08-25 — cd25385 — packages/ui/src/renderer/app.ts, packages/ui/renderer/styles.css, design/file-import/README.md, veri/sources/SRC-045-design-file-import-drag-and-drop-intake-into-source-document.md — Import… header label (accessible name kept), or-import-files… cross-link in the Source popover, import ghost row in the empty Sources panel; design bundle README + SRC-045 amended per DEC-109. 331 UI tests pass, tsc clean, veri check 0 issues.
