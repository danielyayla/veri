---
id: WO-001
type: work-order
title: Core library — parse, validate, link graph
status: done
created: 2026-08-06
updated: 2026-08-06
links:
  - id: REQ-001
    rel: delivers
  - id: DEC-001
    rel: constrained-by
  - id: DEC-002
    rel: constrained-by
---

## Summary

Build `packages/core`: load a `veri/` directory into typed document
objects, validate frontmatter and IDs, and expose the link graph
(forward and backlinks, `[[ID]]` inline refs included). This is the
foundation every other package consumes.

## In scope

- Monorepo scaffold (npm workspaces): `packages/core`, empty stubs for
  `cli` and `mcp`
- Zod schemas for the four document types and shared frontmatter
- Directory loader with per-file error collection (one bad file must not
  abort the load)
- Link graph: resolve frontmatter links and inline `[[ID]]` refs;
  backlinks derivable for any document
- Health checks as pure functions returning structured issues (broken
  link, duplicate ID, invalid frontmatter, WO without requirement, done-WO
  violations) — consumed later by `veri check`
- Unit tests against fixture directories, including deliberately broken
  fixtures

## Out of scope

- CLI ([[WO-002]]), MCP server ([[WO-003]]), demo content ([[WO-004]])
- Context assembly and token counting (lands with WO-003)
- Watching, caching, indexing, or any persistence beyond reading files
- Writing/mutating documents (core is read + validate only for now)

## Requirements

All acceptance criteria of [[REQ-001]] verbatim (see that file).

## Acceptance tests

- [x] Loading the fixtures directory yields exact expected documents,
      links, and backlinks (snapshot test)
- [x] Each broken fixture yields exactly its expected structured issue
- [x] Loading this repository's own `veri/` directory yields zero issues

## Receipts

- 2026-08-06 — 4811035 — root scaffold, packages/core (src + fixtures +
  tests), packages/cli + packages/mcp stubs, DEC-004 — built the core
  library: schemas, parser, loader, link graph, health checks; 20 tests
  green including the self-check on this repo's `veri/`
