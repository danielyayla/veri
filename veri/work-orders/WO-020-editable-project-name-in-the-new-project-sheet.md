---
id: WO-020
type: work-order
title: Editable project name in the New-project sheet
status: in-progress
created: 2026-08-11
updated: 2026-08-13
links:
  - id: SRC-007
    rel: designed-by
  - id: REQ-004
    rel: extends
  - id: WO-018
    rel: extends
  - id: DEC-002
    rel: constrained-by
  - id: DEC-010
    rel: constrained-by
  - id: DEC-012
    rel: constrained-by
  - id: DEC-016
    rel: constrained-by
  - id: DEC-017
    rel: constrained-by
---

## Summary

The New-project sheet ([[WO-018]]) derives the project name from the
picked folder and shows it read-only. That serves "add Veri to this
repo" but strands "start a brand-new project called X": a user who
picks `~/Projects` expecting to create a project *inside* it would
instead scaffold `veri/` into their whole Projects folder. Make the
name editable with create-subfolder semantics, per the SRC-007
addendum: the name is never stored anywhere — it only composes the
target folder ([[DEC-002]]).

## In scope

- The sheet's name row becomes an editable input, defaulting to the
  picked folder's basename.
- Path composition: name equal to the basename targets the picked
  folder (today's behavior, byte-for-byte); any other valid name
  targets `<picked>/<name>`, created by the scaffold. No core change —
  `scaffoldProject`'s recursive mkdir/cpSync already creates the
  parent ([[DEC-016]]).
- The location block always shows the full final target path, live;
  when composing a subfolder, the what-will-be-written preview gains
  the new folder as its first path segment.
- Validation: Create disabled while the name is empty, `.`, `..`, or
  contains a path separator or NUL. Everything else is the
  filesystem's call — a rejected mkdir surfaces in the existing
  in-sheet error.
- MRU entry name = final target's basename ([[DEC-010]]).
- Renderer tests for the composition rule and validation.

## Out of scope

- Renaming existing projects or folders, ever.
- Any change to `packages/core`, the CLI, or the MCP server.
- Storing a project name anywhere other than the folder's own name.
- Changes to the picker, outcomes, demo toggle, or any other sheet
  anatomy beyond the name row and its helper line.

## Requirements

Extends [[REQ-004]] — the new-project sheet.

## Acceptance tests

- [x] Name unchanged → scaffold lands in the picked folder, identical
      to WO-018 behavior.
- [x] Name edited → `<picked>/<name>` is created and scaffolded; the
      location block showed exactly that path before Create was
      pressed, and the preview showed the folder as first segment.
- [x] Empty and invalid names disable Create.
- [x] Composed target already containing `veri/` fails with the
      existing in-sheet error; nothing is written, MRU unchanged.
- [x] The new project's MRU row is named after the final folder.
- [x] `veri check` and `npm test` are clean.

## Receipts
