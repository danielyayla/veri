---
id: DEC-007
type: decision
title: Demo ships as real markdown files inside the CLI package
status: active
approved: 2026-08-10
created: 2026-08-06
updated: 2026-08-06
links:
  - id: WO-004
    rel: constrains
---

## Choice

The skiff demo lives as real files in `packages/cli/demo/` — a complete
project root (`veri/` with 16 documents, plus `README.md` and
`CLAUDE.md`) — shipped in the npm package via the `files` field.
`veri init --demo` copies `veri/` verbatim and writes the root
`README.md`/`CLAUDE.md` only when no file of that name exists
(`COPYFILE_EXCL`), so it never clobbers a user's own files.

## Rejected alternatives

- **Embedded string constants in TypeScript** — the acceptance criterion
  requires every demo document to render cleanly on GitHub; strings in a
  `.ts` file render nowhere, and reviewing demo content in diffs becomes
  miserable.
- **Generating the demo through `veri new` at init time** — templates
  cannot express backdated timestamps, receipts, a supersession chain, or
  the two deliberate health issues; the demo would drift from the mockup.
- **A separate `@veri/demo` package** — a second publish cycle for
  eighteen small files, and `init --demo` would need a resolution story
  for an optional dependency.

## Rationale

Files that exist are files you can review: what sits in the repo (and
renders on GitHub) is byte-for-byte what `veri init --demo` installs. The
demo directory doubles as a fixture — the MCP package's demo test
assembles `get_context("WO-002")` straight from it, so the shipped
content and the tested content can never diverge.
