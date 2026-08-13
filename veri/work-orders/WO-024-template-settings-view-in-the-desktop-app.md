---
id: WO-024
type: work-order
title: Template settings view in the desktop app
status: done
created: 2026-08-13
updated: 2026-08-13
links:
  - id: REQ-010
    rel: implements
  - id: SRC-009
    rel: designed-by
  - id: DEC-023
    rel: constrained-by
  - id: DEC-012
    rel: constrained-by
  - id: DEC-002
    rel: constrained-by
  - id: DEC-020
    rel: constrained-by
  - id: WO-023
    rel: depends-on
  - id: WO-022
    rel: depends-on
---

## Summary

Ship the Templates settings view per [[REQ-010]] and the [[SRC-009]]
handoff: a `⚙` rail entry opening a view tab where the user browses
the five built-in document types, reads and edits each type's body
template in the CodeMirror 6 editor surface from [[WO-022]], sees
`default`/`custom` state at a glance, and resets a customized type to
the built-in default. The view reads and writes the
`veri/templates/<type>.md` files owned by [[WO-023]]'s core APIs —
no second store ([[DEC-002]], [[DEC-023]]).

Per [[DEC-012]] this work order links its design (`rel: designed-by`,
[[SRC-009]]) and may not move to in-progress before that handoff is
reviewed.

## In scope

- **Entry points**: the `⚙` rail button (above `⌁`, instant tooltip
  "Templates") and the command-palette view row (`templates` /
  `settings`), opening one Templates view tab under document-tabs
  rules.
- **Type list**: the five built-in types with type-color swatches and
  always-in-sync `default`/`custom` chips derived from core's
  effective-template API (WO-023) — never a UI-side cache.
- **Editor card**: filename + chip header, the locked generated-
  frontmatter preview block, and the CM6 body editor per SRC-008
  tokens — no guarded ranges, no `[[` autocomplete.
- **Editing semantics**: ⌘S save writing the file verbatim (creating
  `veri/templates/` and the file when absent), per-type dirty
  buffers, the tab dirty dot, Save all / Discard / Cancel on closing
  with dirty buffers, and the clean-reload / dirty-conflict external-
  change model shared with document tabs.
- **Reset to default**: inline confirm, rewrites the file to the
  built-in default, chip and buffer refresh.
- Edge states per the spec: projects without `veri/templates/`,
  externally deleted files, unreadable content.
- Renderer tests where the repo's UI test seams allow (chip
  derivation, buffer/dirty transitions, reset flow).

## Out of scope

- The core/CLI/MCP layer — scaffold defaults, creation fallback,
  loader exclusion, template retrieval are [[WO-023]].
- Any template enforcement or conformance indicators
  ([[DEC-023]] is generative-only).
- Rendered-markdown preview of templates, per-type assembly-policy
  editing, user-defined types, template history — all explicitly
  deferred by the handoff.

## Requirements

Delivers the settings-UI acceptance criteria of [[REQ-010]]: browse,
edit, default-vs-customized distinction, reset, and no-restart effect
on the next created document. Constrained by [[DEC-023]] (files under
`veri/templates/`, out of the graph), [[DEC-012]] (design linked
before implementation), [[DEC-002]] (files are the source of truth),
and [[DEC-020]] (CodeMirror 6 is the editor engine).

## Acceptance tests

- [x] The `⚙` rail button and palette rows open the Templates view;
      all five types listed with correct chips on first open
- [x] Editing a template and saving with ⌘S writes
      `veri/templates/<type>.md`; the chip flips to `custom` in both
      the list and the card header
- [x] A document created immediately after the save starts from the
      edited body (via WO-023's creation path) with untouched
      frontmatter
- [x] Reset to default requires the inline confirm, restores the
      built-in body on disk, and flips the chip back to `default`
- [x] Editing the file outside the app reloads a clean buffer
      silently and shows the conflict banner on a dirty one
- [x] A project with no `veri/templates/` directory shows all types
      as `default` and materializes the directory on first save
- [x] Closing the tab with unsaved buffers prompts before discarding
- [x] `veri check` passes throughout — template edits never produce
      issues

## Receipts

- 2026-08-13 — 2acfb5b — packages/ui/src/renderer/views/templates.ts, packages/ui/src/renderer/views/templates.test.ts, packages/ui/src/renderer/app.ts, packages/ui/src/renderer/tabs.ts, packages/ui/src/renderer/palette.ts, packages/ui/src/renderer/palette.test.ts, packages/ui/src/renderer/api.ts, packages/ui/src/preload.mts, packages/ui/src/main.ts, packages/ui/renderer/styles.css — Templates settings view per SRC-009: rail/palette entry, chips, CM6 editor, save/reset/conflict flows; 199 tests green; live-app verification of chips, save-to-file, creation pickup, reset, and the dirty-conflict banner
