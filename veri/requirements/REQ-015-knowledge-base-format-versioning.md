---
id: REQ-015
type: requirement
title: "Knowledge-base format versioning"
status: accepted
approved: 2026-08-17
created: 2026-08-17
updated: 2026-08-17
links:
  - id: SRC-012
    rel: informed-by
  - id: DEC-002
    rel: constrained-by
  - id: REQ-001
    rel: depends-on
---

The `veri/` on-disk format is versioned, so a knowledge base
created by one release of Veri behaves predictably under any
other. Today the format ([[REQ-001]]) has no version marker: once
strangers hold `veri/` directories, any change to frontmatter
fields, link rels, document types, or template shapes either
silently misparses old projects or strands them. [[WO-028]]
explicitly deferred this; it must exist before the first format
change ships to the public, and the marker itself should exist
before the first public release — retrofitting a version marker
into unversioned directories in the wild is far harder.

- **Marked.** Every `veri/` knowledge base carries an explicit
  format version, written at scaffold time.
- **Checked.** The app, CLI, and MCP server detect a version
  mismatch and respond with a clear statement — "this project
  needs a newer Veri" or "this project predates format N" — never
  a misparse or silent partial load.
- **Migratable.** A knowledge base at format N-1 can be brought to
  N by an explicit, user-consented migration that rewrites files
  in place (they remain plain markdown per [[DEC-002]] — diffable,
  committable, recoverable via git).
- **Honest about unversioned.** Directories created before the
  marker existed are recognized and treated as the oldest format,
  not rejected.

The marker's location and shape, and the migration mechanism, are
decisions to file when work starts.

## Acceptance criteria

- [ ] Newly scaffolded projects carry a format version marker
- [ ] Opening a project whose format is newer than the app states
      the mismatch and does not modify or misrender the project
- [ ] Opening an older-format project offers a migration; running
      it produces a valid current-format project with all content
      preserved, as an inspectable file diff
- [ ] Pre-marker directories open as the oldest format without
      errors
- [ ] `veri check` reports the format version and flags a mismatch
