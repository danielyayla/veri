---
id: WO-032
type: work-order
title: Knowledge-base format versioning
status: done
created: 2026-08-17
updated: 2026-08-17
links:
  - id: SRC-011
    rel: designed-by
  - id: REQ-015
    rel: implements
  - id: REQ-001
    rel: extends
  - id: SRC-012
    rel: informed-by
  - id: DEC-002
    rel: constrained-by
---

## Summary

The `veri/` on-disk format carries no version marker: any future
change to frontmatter, link rels, document types, or template
shapes would silently misparse or strand every knowledge base in
the wild. Before the first public release mints unversioned
directories on strangers' machines, give the format an explicit
version: written at scaffold time, checked everywhere a project is
opened (app, CLI, MCP server), with a consented in-place migration
path and honest handling of pre-marker directories.

## In scope

- Marker shape and location filed as a proposed DEC with rejected
  alternatives (candidates: a field in the scaffolded workflow
  document's frontmatter, a dedicated `veri/format` file, a
  `veri.json`) — weighing [[DEC-002]]'s files-as-source-of-truth
  and how visible the marker is in a diff.
- Scaffolding writes the current format version into every new
  project.
- Core detects the project's format version on load and classifies
  it: current, older (migratable), newer (this Veri is too old),
  or pre-marker (treated as the oldest format, never rejected).
- App, CLI, and MCP server surface the classification as a clear
  statement — never a misparse or silent partial load. Any app
  surface uses native dialogs; if that holds, the design gate is
  satisfied with a [[DEC-026]]-style note, otherwise a design
  artifact comes first ([[DEC-012]]).
- An explicit, user-consented migration that rewrites files in
  place from N-1 to N, producing an inspectable diff (files stay
  plain markdown per [[DEC-002]]; git is the undo). Ships with a
  no-op N→N migration path proving the mechanism before any real
  format change needs it.
- `veri check` reports the format version and flags a mismatch.

## Out of scope

- Any actual change to the document format (this WO versions the
  format as it stands today).
- Automatic or unprompted migration.
- Migration of app-side state outside `veri/` (workspace-state
  JSON, MRU lists).
- Downgrade migrations (newer → older).
- Backfilling markers into existing projects beyond the pre-marker
  = oldest-format rule (the migration path is the backfill).

## Requirements

Implements [[REQ-015]] — knowledge-base format versioning. Extends
[[REQ-001]] (document format).

## Acceptance tests

- [x] `veri init` / app project creation writes the format marker;
      the scaffolded project passes `veri check` untouched
- [x] Opening a project marked with a newer format states the
      mismatch in app, CLI, and MCP server, and modifies nothing
- [x] A pre-marker project opens as the oldest format with no
      errors or warnings beyond the check report
- [x] Running the migration on consent produces a valid
      current-format project, all content preserved, visible as a
      file diff
- [x] `veri check` reports the format version and flags mismatches
- [x] Marker shape filed as a proposed DEC with rejected
      alternatives
- [x] `veri check` and `npm test` are clean

## Receipts

- 2026-08-17 — 3b2c55f — packages/core/src/format.ts, packages/core/src/load.ts, packages/core/src/check.ts, packages/core/src/types.ts, packages/core/src/scaffold.ts, packages/cli/src/commands.ts, packages/cli/src/cli.ts, packages/mcp/src/server.ts, packages/ui/src/main.ts, packages/cli/demo/veri/format, veri/format, DEC-030, SRC-011 — claude-code session: veri/format marker (DEC-030 proposed), scaffold stamping, load-time classification, veri migrate with recorded 0→1 marker-only step, check format line + newer/invalid issues, MCP per-call guard, app native-dialog gate (verified live: headless shot at format 1 succeeds, format 99 blocks); repo and demo migrated; all acceptance boxes checked, 231 tests green
