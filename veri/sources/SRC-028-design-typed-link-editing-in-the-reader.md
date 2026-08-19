---
id: SRC-028
type: source
title: Design — Typed-link editing in the reader
status: imported
created: 2026-08-19
updated: 2026-08-19
links:
  - id: REQ-009
    rel: designs
  - id: REQ-004
    rel: designs
  - id: SRC-008
    rel: builds-on
  - id: SRC-016
    rel: derived-from
  - id: DEC-002
    rel: constrained-by
  - id: DEC-012
    rel: constrained-by
---

> Drafted 2026-08-19 by an agent session (Claude Code) for the
> typed-link editing work order, per the DEC-012 design gate, under
> Daniel's P2 implementation directive. Approved by Daniel 2026-08-19.
> Written spec only.

[[SRC-016]]: "typed `links:` entries are raw-YAML-only" — and
[[REQ-004]] has promised "new links" as a UI edit since acceptance.
Today the reader's frontmatter card shows `links · N outbound` as a
dead count, and adding a typed link means edit mode, YAML indentation
and all. The graph's edges deserve the same direct manipulation the
status control gives lifecycle.

## The links row becomes the links editor

In the reader's frontmatter card, the `links` row expands into the
outbound list (the same data the Connections panel shows, in
frontmatter order — the author's order, not the panel's dedup):

- **Each entry**: the id as a chip (existing `idChip` — click
  navigates, hover previews), the `rel` as muted text beside it, and
  an `×` remove control on the row (visible on hover/focus).
- **Add link**: an `+ add link` affordance opens a two-field inline
  row — target and rel. Target is an input backed by the existing
  pure `autocomplete()` from `derive.ts` (the note composer's — same
  popover register); rel is a free-text input with a datalist of the
  rel values already used in this project, since the vocabulary is
  the author's, not the system's ([[SRC-016]] told us to stop curating
  it). Rel defaults to `relates-to`; empty is refused (schema
  requires min 1). Enter commits, Escape cancels.
- **Writes**: one IPC (`setLinks` beside `appendNote`/`setStatus` in
  the existing api surface) sends the full new `links` array; the
  main process rewrites only the frontmatter `links:` block and the
  `updated:` date via core, byte-preserving everything else — the
  file is the document ([[DEC-002]]), and the write is the smallest
  true diff. The result must round-trip `veri check` cleanly.
- **Guards**: the same save-time rules as the editor — `id:` and
  `approved:` untouched, status untouched. Editing links on an
  accepted document is legal and surfaces as the WO-045 drift
  advisory — the advisory tier's job, never a block. A link to an
  unknown id is refused at commit (the autocomplete only offers real
  ids; a hand-typed miss shows the existing error register inline).
- Inbound links stay read-only — they belong to other documents.

## Everything unchanged

Edit mode's raw YAML (still fully supported — this is a shortcut,
not a replacement; one write path in core serves both), the
Connections panel, `[[` autocompletes, the reader's other frontmatter
rows, the schema (`{ id, rel }`, `rel` free text).
