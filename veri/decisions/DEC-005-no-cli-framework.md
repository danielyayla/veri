---
id: DEC-005
type: decision
title: No argument-parsing library in the CLI
status: active
approved: 2026-08-10
created: 2026-08-06
updated: 2026-08-06
links:
  - id: WO-002
    rel: constrains
---

## Choice

The `veri` CLI dispatches on `process.argv` with a plain switch: four
commands, one boolean flag (`--demo`), one or two positionals each. Its
only runtime dependency is `@veri/core`.

## Rejected alternatives

- **commander / yargs** — subcommand routing, help generation, and
  completions we don't need for four verbs; a dependency tree in exchange
  for saving ~30 lines.
- **node:util parseArgs** — built-in, but its option model still has to be
  mapped onto per-command positionals by hand, which is most of the work
  anyway.

## Rationale

The CLI surface is small and frozen by REQ-002. Revisit only if commands
grow nested options (a likely trigger: `veri new` gaining link flags).
