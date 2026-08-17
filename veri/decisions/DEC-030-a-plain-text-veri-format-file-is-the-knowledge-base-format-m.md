---
id: DEC-030
type: decision
title: "A plain-text veri/format file is the knowledge-base format marker"
status: active
approved: 2026-08-17
created: 2026-08-17
updated: 2026-08-17
links:
  - id: WO-032
    rel: constrains
  - id: REQ-015
    rel: extends
  - id: DEC-002
    rel: follows-from
---

## Choice

The format version marker is a file named `format` at the root of the `veri/` directory, containing a single decimal integer plus a trailing newline (currently `1`). It is written by scaffolding, read before any document parsing, and bumped only by migration. A `veri/` directory without the file is classified pre-marker and treated as format 0, the oldest format — never rejected. Migration 0→1 consists of writing the marker and touching nothing else, so the mechanism ships proven and doubles as the backfill for every pre-marker project in the wild.

## Rejected alternatives

- **A `format:` field in `veri/workflow.md` frontmatter** — keeps everything markdown, but creates a chicken-and-egg: the version that governs how documents parse would live inside a document that must be parsed first. It is also user-editable prose that demos may replace wholesale, and per-type frontmatter schemas would need a special case.
- **A `veri.json` config file** — machine-friendly and extensible, but DEC-002 already rejected JSON as human-hostile, and an open-ended config file invites settings creep into a directory that is deliberately nothing but documents.
- **A version field in every document's frontmatter** — per-file granularity nobody needs, N places to disagree with each other, and migrations would touch every file just to bump a number, polluting diffs.

## Rationale

The marker must be readable with no Veri tooling and before any parsing decision is made — a one-integer text file is inspectable at a glance on GitHub, trivially diffable, and imposes zero parse dependencies. Treating absence as format 0 keeps every existing project openable forever (REQ-015's honesty clause), and making the 0→1 migration a pure marker-write means the migration machinery is exercised from day one without risking anyone's content.
