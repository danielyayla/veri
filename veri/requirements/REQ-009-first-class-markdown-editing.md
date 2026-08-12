---
id: REQ-009
type: requirement
title: First-class markdown editing in the desktop UI
status: draft
created: 2026-08-12
updated: 2026-08-12
links:
  - id: REQ-004
    rel: depends-on
  - id: REQ-001
    rel: depends-on
  - id: REQ-008
    rel: depends-on
  - id: DEC-002
    rel: constrained-by
  - id: DEC-008
    rel: constrained-by
  - id: DEC-020
    rel: constrained-by
---

Veri's desktop UI becomes a first-class markdown editor, in the sense
Obsidian is one: users create, open, and directly edit requirements,
decisions, work orders, sources, and any other markdown document as
free text. The experience is working with normal local markdown files;
Veri's structure, relationships, validation, and AI-native workflows
layer on top of the files rather than replacing them with forms.

The contract follows from [[DEC-002]]: the file on disk is the
document. Saving writes the file verbatim; core re-parses on read.
A document is always valid *as a file* the moment it is saved —
validity as a Veri document (schema per [[REQ-006]], link integrity,
status rules) is reported by `veri check` and surfaced as indicators,
never enforced as a gate on saving. The one exception is the approval
boundary of [[REQ-008]]: editing must not become a backdoor around it.

Scope of v1 editing:

1. **Open and edit** — any document in `veri/` opens in an editor tab
   showing the full text, frontmatter included, as editable markdown.
   Save persists exactly what the user wrote, updating only the
   `updated:` frontmatter date.
2. **Create** — creating a document asks only for a type and title,
   scaffolds frontmatter with the next free ID and today's dates at
   the appropriate initial status (draft/proposed/backlog/imported),
   and drops the user into the editor. No wizard, no required form.
3. **Wiki-link support** — typing `[[` opens the ID/title autocomplete
   [[REQ-004]] already requires, inserting a valid `[[ID]]` link.
   Existing links in the editor resolve on click.
4. **Save-time guards** — the editor refuses to persist an edit that
   (a) changes or removes `id:`, or (b) adds or alters an `approved:`
   stamp or promotes `status:` past the approval gate. Promotion
   remains the user's act via `veri approve` or the app's approve
   control ([[REQ-008]]). Everything else — including edits that
   `veri check` will flag — saves freely.
5. **External edits** — the UI watches `veri/` and reflects outside
   changes without restart (already an acceptance criterion of
   [[REQ-004]]). If a file changes on disk while an editor tab holds
   unsaved edits, the UI warns and lets the user choose reload or
   overwrite; it never silently drops either side.

Out of scope for v1: split panes, vim/emacs keymaps, themes beyond the
app's existing light/dark, a plugin system, editing files outside the
project's `veri/` directory, and WYSIWYG rendering of the document
being edited (the reader view remains the rendered surface).

## Acceptance criteria

- [ ] Every document type opens in an editor tab; save writes the
      exact edited text (plus `updated:` bump) and the change is
      visible in reader, board, graph, and decision log without
      restart
- [ ] Creating each document type from the UI yields a file that
      passes `veri check` before the user types anything
- [ ] `[[` autocomplete works inside the editor and inserts links
      that resolve project-wide
- [ ] Attempting to edit `id:` or `approved:`, or to promote a status
      past the approval gate, is blocked at save with a clear message,
      and `veri approve` remains the only promotion path
- [ ] An external change to an open, dirty document triggers the
      reload/overwrite choice; no edit is lost silently
- [ ] A document deliberately saved with schema violations saves
      successfully and shows the corresponding `veri check`
      indicators
- [ ] No network calls
