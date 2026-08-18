---
id: WO-038
type: work-order
title: Document ids are never reused after deletion
status: in-progress
created: 2026-08-18
updated: 2026-08-18
links:
  - id: REQ-001
    rel: implements
---

## Summary

AGENTS.md promises ids are "stable, never reused, never renamed", but id
allocation is max+1 over *existing* files, so deleting the newest document
frees its id. This happened in practice: the scratch REQ-016 was deleted
and the id was immediately reissued to a new requirement. Two independent
copies of the allocator exist (document creation in core, decision
write-back in the MCP layer). Give the project one allocator that consults
a plain-text high-water record, per [[DEC-037]], so an id, once issued,
is consumed forever — with or without git, in every write path.

## In scope

- A `veri/ids` high-water file: one `PREFIX N` line per type, plain text,
  self-healing (absent or unparseable lines fall back to the scan of
  existing files, then the next write repairs the record).
- One shared allocator in core used by document creation and by the MCP
  decision write-back; both duplicated max+1 blocks are deleted.
- Allocation takes `max(existing files, high-water) + 1` and bumps the
  record on every successful create.
- Tests covering the reuse scenario (create → delete → create skips the
  deleted id), backfill on first write, and corrupt-record fallback.

## Out of scope

- Recovering ids already lost to past deletions (REQ-016's reuse stands
  unless renumbered by hand).
- Git-history awareness of any kind.
- Scaffolding changes — a new project needs no ids file until its first
  document is created.
- A knowledge-base format bump: the file is additive and optional, and
  every existing tool ignores non-markdown files in `veri/`.

## Requirements

Implements the id-stability clause of [[REQ-001]] — ids are stable, never
reused, never renamed — as an enforced property instead of a convention.

## Acceptance tests

- [ ] Creating a document, deleting its file, and creating another of the
      same type yields a fresh id, not the deleted one.
- [ ] A project with no `veri/ids` file allocates exactly as before on the
      first write and writes the record as a side effect.
- [ ] The MCP `file_decision` path and `veri new` share one allocator and
      both bump the record.
- [ ] A corrupt or partial `veri/ids` never blocks creation — invalid
      lines are ignored and repaired on the next write.
- [ ] `veri check` and the full test suite are clean.

## Receipts

(none yet)
