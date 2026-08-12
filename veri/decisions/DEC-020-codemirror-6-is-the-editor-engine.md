---
id: DEC-020
type: decision
title: "CodeMirror 6 is the editor engine for first-class markdown editing"
status: proposed
created: 2026-08-12
updated: 2026-08-12
links:
  - id: REQ-009
    rel: constrains
  - id: DEC-008
    rel: refines
---

## Choice

The editing surface required by [[REQ-009]] is built on CodeMirror 6
(`@codemirror/*` packages), embedded in the vanilla TypeScript renderer
of [[DEC-008]]. CodeMirror owns its DOM subtree, cursor, selection, and
undo history as an island inside the renderer's rebuild-from-state
model; the surrounding app treats it as an opaque widget that emits
document text. Only the markdown language package and core editor
packages are used — no collab, no LSP. All packages are bundled
locally; no network at runtime.

The editor shows the raw markdown, frontmatter included. Live preview
(Obsidian-style inline rendering) is a possible later layer via
CodeMirror decorations, not part of this decision.

## Rejected alternatives

- **Plain `<textarea>` + preview pane** — zero dependencies and honest,
  but it caps the product at "text box that saves files": no syntax
  highlighting, no decorations for `[[ID]]` links, no per-range
  read-only guards, and a rewrite is guaranteed the moment the editor
  is asked to feel first-class. REQ-009's stated bar ("in the sense
  Obsidian is one") is exactly the bar a textarea cannot meet.
- **Monaco** — VS Code's editor, excellent for code, but heavyweight
  (~5 MB), web-worker-oriented, and tuned for programming languages;
  its markdown story is incidental. Its strengths (IntelliSense,
  multi-model workbenches) are all things Veri doesn't need.
- **ProseMirror / contenteditable WYSIWYG** — renders rich text as the
  primary surface, which inverts REQ-009's contract: the markdown file
  stops being what the user directly manipulates, and round-tripping
  arbitrary markdown (frontmatter, edge-case syntax) through a rich
  document model is exactly the lossy translation DEC-002 exists to
  avoid.
- **Framework-bound editor components (Milkdown, TipTap, etc.)** —
  pull in ProseMirror plus a framework runtime, colliding with
  DEC-008's vanilla-renderer choice for less control, not more.

## Rationale

CodeMirror 6 is the same engine Obsidian's editor is built on — it is
the known-good answer to "make raw markdown editing feel first-class."
It is framework-free vanilla TypeScript, so it composes with DEC-008's
renderer without adapters. Its architecture directly serves REQ-009's
hard requirements: decorations give `[[ID]]` links highlighting, click
navigation, and the `[[` autocomplete; its transaction filter mechanism
can implement the save-time guards on `id:` and `approved:` at the
edit layer; and because it owns its own state and DOM, it survives the
renderer's rebuild-on-update cycle instead of fighting it — the classic
failure mode of naive textarea/state-diffing approaches. The
dependency cost lands only in `packages/ui`, which already carries
Electron; `packages/core` stays at `yaml` + `zod`.
