---
id: WO-003
type: work-order
title: MCP server — context packages and write-back
status: backlog
created: 2026-08-06
updated: 2026-08-06
links:
  - id: REQ-003
    rel: delivers
  - id: DEC-003
    rel: constrained-by
  - id: WO-001
    rel: depends-on
---

## Summary

Build `packages/mcp`: a stdio MCP server exposing `get_context`, `search`,
`file_decision`, and `file_receipt`. This is the product's core promise —
after this work order, a coding agent gets its context from Veri instead of
from a human pasting documents.

## In scope

- Stdio MCP server (official TypeScript SDK) configured per-project,
  pointed at a `veri/` directory
- Context assembly per the package rules in [[REQ-003]]: 2-hop traversal
  from the work order, full text for requirements/active decisions, source
  excerpts, superseded decisions excluded but named, CLAUDE.md included
- Deterministic package ordering (conventions → work order → requirements
  → decisions → sources) and rough token estimates (chars/4 is fine)
- Write-back: `file_decision` and `file_receipt` producing documents that
  pass `veri check`
- README section: configuring the server in Claude Code

## Out of scope

- HTTP/SSE transport, auth, multi-project serving
- Embeddings or semantic search (`search` is exact/substring match)
- Automatic drift detection or code anchoring

## Requirements

All acceptance criteria of [[REQ-003]] verbatim (see that file).

## Acceptance tests

- [ ] From Claude Code with the server configured: `get_context("WO-004")`
      returns a package containing REQ, DEC, and conventions content
- [ ] `file_decision` then `veri check` → zero issues; new DEC visible in
      `veri list`
- [ ] `file_receipt` appends to the correct WO; second call appends a
      second receipt without clobbering the first
- [ ] Context for a WO linked to a superseded decision names it under
      "already rejected" and omits its body

## Receipts

(none yet)
