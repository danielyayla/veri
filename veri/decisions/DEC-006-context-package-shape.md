---
id: DEC-006
type: decision
title: Context packages are rendered markdown over an undirected 2-hop neighborhood
status: active
created: 2026-08-06
updated: 2026-08-06
links:
  - id: WO-003
    rel: constrains
---

## Choice

`get_context` returns one rendered markdown document (headed sections,
token estimates in headings), not structured JSON. The 2-hop traversal
follows links in both directions: a decision that constrains a work order
links *to* it, so incoming edges count as "linked". Source excerpts are
the first 600 characters of the body.

## Rejected alternatives

- **Structured JSON package** — machine-cleaner, but the consumer is an
  LLM: markdown is what it reads natively, and every MCP client renders
  text content without extra handling.
- **Outgoing-only traversal** — simpler to reason about, but misses the
  most important documents in practice: decisions point at what they
  constrain, so a work order's constraining decisions are upstream of it,
  not downstream. `get_context("WO-004")` would contain no decision at
  all.

## Rationale

The package exists to be pasted into an agent's context window verbatim.
One markdown body with deterministic section order (conventions → work
order → requirements → decisions → sources) reads the same to a human
auditing it and an agent consuming it.
