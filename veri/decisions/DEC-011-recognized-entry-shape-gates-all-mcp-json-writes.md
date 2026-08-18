---
id: DEC-011
type: decision
title: Recognized-entry shape gates all .mcp.json writes
status: active
approved: 2026-08-18
created: 2026-08-07
updated: 2026-08-18
links:
  - id: WO-007
    rel: constrains
  - id: REQ-005
    rel: implements
---

## Choice

The agent-connection panel treats a `mcpServers.veri` entry as its own
iff it has exactly the shape Veri writes: `{"command": "node", "args":
[<string>, <string>]}` with no extra keys. Anything else — different
command, different arity, an `env` block — is a *conflict*: shown
verbatim, replaceable only by explicit click, never auto-repaired. Two
hard cases get conservative handling:

- An **unparseable** `.mcp.json` is surfaced as its own card and every
  write refuses to touch the file, because "preserve all non-Veri
  content" cannot be guaranteed through a rewrite of a file that
  doesn't parse.
- **Relative paths** inside a recognized entry (this repo's own
  `.mcp.json` uses them) are resolved against the project root for the
  health checks and the effective-config display, but repairs keep
  whatever style the entry already has where the spec allows
  ("Fix path" rewrites only the root argument).

## Rejected alternatives

- **Marker-based ownership** (a `"_veri": true` key or sidecar noting
  what the app wrote): pollutes a file other tools parse, and breaks
  the moment a teammate hand-edits an otherwise valid entry. Shape
  recognition keeps the file clean and treats hand-written-but-correct
  entries as first-class.
- **Loose recognition** (any entry whose args end in `server.js`):
  risks "repairing" — i.e. silently rewriting — a deliberate custom
  setup, which [[REQ-005]] forbids.
- **Best-effort regex edit of unparseable files**: could corrupt
  neighboring servers; refusing and saying so is the only write
  strategy that keeps the never-lose-other-entries guarantee absolute.

## Rationale

Shape recognition puts the ownership marker in the only place that
cannot drift: the entry itself. The file stays clean for other tools,
a hand-written-but-correct entry is treated as Veri's own, and every
ambiguous case fails closed to a visible conflict — the one strategy
that keeps [[REQ-005]]'s never-lose-other-entries guarantee absolute.
