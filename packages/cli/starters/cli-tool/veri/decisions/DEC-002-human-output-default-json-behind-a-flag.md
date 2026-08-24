---
id: DEC-002
type: decision
title: Human-readable output by default, machine-readable behind a flag
status: proposed
created: 0001-01-01
updated: 0001-01-01
links:
  - id: REQ-001
    rel: satisfies
---

## Choice

The default output of every command is written for a person at a
terminal. A `--json` flag (one name, every command) emits the same
information as structured data with a stability promise.

## Rejected alternatives

- **JSON by default** — machine-first defaults read as noise in the
  common case (a human running the tool by hand) and push every casual
  user through a pager or `jq` just to see what happened.
- **Auto-detect: JSON when piped, text when a terminal** — magic
  output switching means the command a user tested by hand behaves
  differently inside their script; predictability ([[REQ-001]]) beats
  cleverness.

## Rationale

Two audiences, two formats, one explicit switch. The human format may
improve freely; the `--json` shape is the compatibility surface
scripts rely on, which keeps the stability promise cheap to state and
possible to keep.
