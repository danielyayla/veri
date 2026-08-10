---
id: WO-009
type: work-order
title: Assembly policy in the schema — packing rules move out of hardcoded context code
status: backlog
created: 2026-08-07
updated: 2026-08-07
links:
  - id: REQ-006
    rel: delivers
  - id: REQ-003
    rel: depends-on
  - id: WO-008
    rel: depends-on
  - id: WO-003
    rel: depends-on
  - id: DEC-006
    rel: constrained-by
---

## Summary

The rulebook, part two: each type's schema also says how its documents
get packed into a context package. Today those rules are hardcoded in
`packages/mcp/src/context.ts` per [[DEC-006]]: requirements and active
decisions in full, superseded decisions name-only, sources as 600-char
excerpts, CLAUDE.md always included. This work order moves those rules
into the schemas from [[WO-008]] and makes `get_context` read them,
without changing what the packages contain for existing types.

Also adds the last derived surface: the MCP server exposes each type's
writing guidance (from the schema) so any connected agent — whatever
the model — learns how this project writes its documents.

Implementation must file a decision recording the assembly-policy
vocabulary (full / excerpt / name-only / always-included, and what
each means). If the chosen shape restates [[DEC-006]]'s rules rather
than merely relocating them, that decision supersedes DEC-006;
otherwise DEC-006 stays active and the new decision links to it.

## In scope

- An assembly-policy field on each type's schema in core, expressing
  at least: full body, excerpt (with length), name-only by status,
  always-included
- `get_context` (MCP) packs each document according to its type's
  policy; the per-type special cases are removed from context.ts
- Byte-identical (or provably equivalent) package output for this
  repo's existing documents before and after the change
- MCP surface for retrieving a type's writing guidance
  (sections + guidance lines from the schema)
- The decision described in the Summary
- Tests: policy-driven packing per type, guidance retrieval

## Out of scope

- New document types (product-overview etc. — proposed separately
  once this machinery exists)
- Changing the traversal itself (still undirected, 2 hops,
  per [[DEC-006]])
- Replacing the CLAUDE.md conventions mechanism (model-agnostic
  conventions are a separate proposal; the always-included hook this
  work order adds is what that proposal will plug into)
- User-editable schemas
- UI changes beyond what already renders context packages

## Requirements

Delivers the assembly-policy half of [[REQ-006]]. Constrained by
[[DEC-006]]'s package shape and traversal; depends on the schemas
from [[WO-008]] and the MCP server from [[WO-003]].

## Acceptance tests

- [ ] `get_context` output for WO-001–WO-007 in this repo is unchanged
      after the migration
- [ ] No per-type packing special cases remain in context.ts — packing
      is driven by the schemas
- [ ] An agent can fetch writing guidance for each document type over
      MCP
- [ ] A new assembly-policy decision exists with rejected
      alternatives; DEC-006's status honestly reflects whether it was
      superseded
- [ ] `veri check` clean, all tests pass

## Receipts

(none yet)
