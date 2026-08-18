---
id: WO-046
type: work-order
title: "Reader markdown parity"
status: in-progress
created: 2026-08-18
updated: 2026-08-18
links:
  - id: REQ-009
    rel: implements
  - id: SRC-020
    rel: designed-by
  - id: SRC-016
    rel: derived-from
---

## Summary

Close the reader's markdown gap named by [[SRC-016]]: the rendered subset (no ordered lists, fenced code, tables, blockquotes, images, italic) degrades exactly the SRC design documents this repo is richest in, and the reader's inline-ref regex omits WF so [[WF-001]] links only work in edit mode. Extend the hand-rolled parser in packages/ui markdown.ts to the corpus-evidenced subset per [[SRC-020]]: parity is defined by what veri/ documents actually use, not CommonMark.

## In scope

- Extend the inline ref regex to include WF ids so [[WF-001]] renders as a chip
- Ordered lists rendered with the author's numbering in the existing list treatment
- Fenced code blocks rendered as block-level pre in the mono treatment; fence interiors opaque to heading/section splitting
- Pipe tables rendered as a plain grid, header row bold, horizontal scroll inside the reader column
- Blockquotes rendered as the muted paragraph treatment with a left rule
- Images (![alt](path)) resolved relative to the document's file, alt as caption, amber broken treatment when missing
- Inline italic (*text*)
- Colocated tests for parser and section splitting over the new constructs

## Out of scope

- Full CommonMark or any markdown dependency — the parser stays the hand-rolled single-pass line parser
- Syntax highlighting in fences
- Edit-mode changes, autocomplete unification, guards — SRC-008 canon untouched
- Link resolution changes in core
- New colors or tokens

## Requirements

- [[REQ-009]] — implements
- [[SRC-020]] — designed-by
- [[SRC-016]] — derived-from

## Acceptance tests

- [x] WF-001's [[WF-001]] refs render as chips in read mode
- [x] SRC-016's scorecard renders as a table, not a paragraph of pipes
- [x] WF-001's numbered implementer rules render as an ordered list with numbers
- [x] A fenced yaml block renders as a code block and a ## line inside a fence never becomes a section
- [x] The design docs' > attribution notes render as blockquotes
- [x] A missing image path renders the amber broken treatment, never a silent gap
- [x] npm test passes; veri check reports zero issues

## Receipts

(none yet)
