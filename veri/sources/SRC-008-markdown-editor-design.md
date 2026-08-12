---
id: SRC-008
type: source
title: Design handoff — First-class markdown editor (edit mode for tabs)
status: imported
created: 2026-08-12
updated: 2026-08-12
links:
  - id: REQ-009
    rel: designs
  - id: DEC-020
    rel: designs
---

High-fidelity written design handoff for the direct-editing surface
required by [[REQ-009]], built on the CodeMirror 6 engine chosen in
[[DEC-020]]. Files live in `design/markdown-editor/`:

- `README.md` — self-sufficient written spec (no HTML prototype in this
  bundle): read/edit mode toggle per document tab (⌘E), the CM6 source
  editor's typography and syntax palette on the canon tokens, guarded
  frontmatter ranges enforcing the [[REQ-008]] approval boundary
  (`id:` / `approved:` / gate-crossing `status:` edits rejected with an
  amber flash and status-row notice), explicit ⌘S save with dirty-dot
  tab semantics and Save/Discard/Cancel close prompt, the
  clean-reload / dirty-conflict banner model for external file changes,
  caret-anchored `[[` autocomplete, the ⌘N / sidebar-`+` creation flow
  (type + title → scaffolded file, opened pinned in edit mode), edge
  cases (malformed or deleted frontmatter, deleted file, write errors),
  accessibility notes, and the tab-state extension
  (`mode` / `dirty` / `buffer` / `conflict`).

The spec introduces no new design tokens — every color, font, and
radius reuses the canon in `design/README.md`, and tab behavior extends
`design/document-tabs/` ([[SRC-004]]) unchanged.
