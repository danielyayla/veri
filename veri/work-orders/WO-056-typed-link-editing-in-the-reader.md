---
id: WO-056
type: work-order
title: "Typed-link editing in the reader"
status: backlog
created: 2026-08-19
updated: 2026-08-19
links:
  - id: REQ-009
    rel: implements
  - id: SRC-028
    rel: designed-by
  - id: SRC-016
    rel: derived-from
---

## Summary

Typed `links:` stop being raw-YAML-only ([[SRC-016]]): per [[SRC-028]], the reader frontmatter card's dead `links · N outbound` count becomes the links editor — each outbound entry as an id chip (navigating, previewing) with its `rel` beside it and an `×` on hover/focus, plus an `+ add link` inline row whose target field reuses the existing pure `autocomplete()` and whose rel field is free text with a datalist of the project's existing rels (default `relates-to`). Writes go through one new `setLinks` IPC beside `appendNote`/`setStatus`; main rewrites only the frontmatter `links:` block and `updated:` via core — the smallest true diff, round-tripping `veri check` cleanly. Guards match the editor (id/approved/status untouched); edits to accepted docs surface as WO-045 drift advisories, never blocks. [[REQ-004]] has promised "new links" as a UI edit since acceptance; this delivers it.

## In scope

- The expanded links row in the reader frontmatter card: entries in frontmatter (author) order, id chips via `idChip`, muted rel text, `×` remove, `+ add link` two-field inline row (autocomplete target, datalist rel, Enter commits / Escape cancels, empty rel refused, unknown id refused with the existing inline error register)
- A core function that rewrites a document's frontmatter `links:` block (plus `updated:`) byte-preserving everything else, used by a new `setLinks` IPC in main
- Tests: round-trip byte-preservation, guard behavior, unknown-id refusal, rel datalist derivation

## Out of scope

- Editing inbound links (they belong to other documents)
- Any curated rel vocabulary, enum, or validation beyond non-empty ([[SRC-016]]: stop curating what the system ignores)
- Changes to edit mode's raw YAML editing, the Connections panel, or either `[[` autocomplete
- Inline `[[ref]]` editing (body text is the editor's job)

## Requirements

- [[REQ-009]] — implements
- [[SRC-028]] — designed-by
- [[SRC-016]] — derived-from

## Acceptance tests

- [ ] Adding a link from the reader writes a file that differs only in the `links:` block and `updated:`, passes `veri check`, and appears immediately in the Connections panel and graph surfaces
- [ ] Removing a link removes exactly that entry; order of the others is preserved byte-for-byte
- [ ] The rel datalist offers exactly the rels in use in the project; empty rel and unknown target are refused inline
- [ ] Editing links on an accepted document succeeds and surfaces the expected drift advisory; `id:`/`approved:`/`status:` are untouched by the write path
- [ ] `veri check` stays at zero issues (drift advisories aside); full typecheck and test suite pass

## Receipts

(none yet)
