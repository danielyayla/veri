---
id: WO-094
type: work-order
title: "Artifact import: veri import converts arbitrary files into source documents"
status: in-progress
created: 2026-08-25
updated: 2026-08-25
links:
  - id: REQ-031
    rel: implements
  - id: SRC-044
    rel: derived-from
  - id: REQ-024
    rel: relates-to
  - id: DEC-060
    rel: constrained-by
---

## Summary

Add a `veri import <file>` path that turns an arbitrary evidence file into a well-formed SRC document — original preserved, text extracted, ready for distillation — matching competitors' drag-in ergonomics without giving up Veri's curation model.

Lower the intake bar for evidence. Today a source document is authored by hand (or filed by an agent over MCP); competitors let users drag in any file — documents, transcripts, email threads, audio — and agents can read them ([[SRC-044]]). Veri should match the intake ergonomics while keeping its curation model: imported files become SRC documents ready for distillation into requirements and decisions, never a loose searchable blob.

## In scope

- A `veri import <file>` CLI command that converts a file into a new SRC document: frontmatter generated (next free id, `status: imported`, dates), body carrying the extracted text, title derived from filename or content.
- Text-bearing formats first: plain text, markdown, and formats whose text extraction needs no new heavy dependencies. Where extraction is not possible, the command says so plainly rather than filing an empty shell.
- The original file preserved alongside the knowledge base (location and naming to be decided during implementation — file the choice as a proposed decision), with the SRC document referencing it.
- Import lives in core as a pure function over already-read file content, per the architecture constraints ([[DEC-060]]); the CLI owns file access.
- Tests colocated per repo convention.

## Out of scope

- Audio/video transcription (requires network or heavy dependencies; v1 has neither — note it as a future direction only).
- Drag-and-drop in the desktop app (follow-up UI work order; this one delivers the core + CLI seam it will reuse).
- Any change to brownfield import ([[REQ-024]], [[WO-075]]) — that flow mines a repo; this one ingests a single evidence file.
- Any indexing, embedding, or retrieval machinery.

## Acceptance tests

- [ ] `veri import <file>` on a text or markdown file files a well-formed SRC document with the extracted content and a reference to the preserved original.
- [ ] The command refuses unsupported formats with a clear message naming what is supported.
- [ ] Import logic lives in core with no fs access; the CLI adapter owns reading the file.
- [ ] `veri check` passes on a knowledge base after an import.
- [ ] Non-trivial choices (original-file storage location, supported-format set) are filed as proposed decisions.

## Requirements

- [[REQ-031]] — implements
- [[SRC-044]] — derived-from
- [[REQ-024]] — relates-to
- [[DEC-060]] — constrained-by

## Receipts

(none yet)
