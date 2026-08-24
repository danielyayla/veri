---
id: DEC-001
type: decision
title: Flags over interactive prompts
status: proposed
created: 0001-01-01
updated: 0001-01-01
links:
  - id: REQ-004
    rel: satisfies
---

## Choice

Every input a command needs is expressible as a flag or argument.
Interactive prompts, where they exist at all, are sugar on top of
flags — never the only way to supply a value.

## Rejected alternatives

- **Wizard-style prompting as the primary interface** — friendlier for
  a first run, but it makes every scripted use a special case, hides
  the tool's real surface from `--help`, and violates non-interactive
  safety ([[REQ-004]]) the moment a prompt sneaks into a code path CI
  hits.
- **A full-screen terminal UI** — powerful for exploration, but it is
  a second interface to build, test, and keep in sync; a young tool
  earns a TUI after its flag surface stabilizes, not before.

## Rationale

Flags are self-documenting (`--help` is the spec), composable, and
identical for humans, scripts, and agents. Prompts added later as
convenience cost nothing if every one of them has a flag equivalent —
that ordering is what this decision fixes.
