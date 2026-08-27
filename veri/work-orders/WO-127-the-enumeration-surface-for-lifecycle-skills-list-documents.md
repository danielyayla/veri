---
id: WO-127
type: work-order
title: "The enumeration surface for lifecycle skills: list_documents and the dispatch queue over MCP"
status: backlog
created: 2026-08-27
updated: 2026-08-27
links:
  - id: REQ-041
    rel: implements
  - id: REQ-008
    rel: constrained-by
# binds:         # code this work order claims (optional)
#   paths: []    # repo-root-relative globs
#   tests: []    # test files proving it (path or path::name)
---

## Summary

Two read-only MCP tools that let a skill orient without shelling out to the CLI or leaning on ranked search ([[REQ-041]] items 1 and 2). `list_documents` filters the corpus by type, status, and an updated-before cutoff; `get_queue` serves the dispatch queue — ready work orders in `nextDispatchable` order plus the claims held on in-progress ones. Both are thin derivations over already-parsed documents: `nextDispatchable` in `packages/core/src/next.ts` was written for "any future dispatcher" and this is that dispatcher, and the status predicates already live in `packages/core/src/pending.ts`. No new core concepts — the work is one MCP read module, its registration, and tests.

## In scope

- A `list_documents` MCP tool taking optional `type`, `status`, and `updated_before`, returning id, title, type, status, updated, and path per hit, in `compareIds` order
- A `get_queue` MCP tool returning ready work orders in `nextDispatchable` order, plus in-progress work orders with their `claimed_by`/`claimed_at`
- One new read module under `packages/mcp/src/`, reusing `nextDispatchable`, `isPending`, and `isWithdrawn` from core rather than re-deriving status logic
- Registration in `packages/mcp/src/server.ts` with strict schemas that refuse unknown keys (per DEC-118's lesson)
- Colocated tests over filtering, ordering, the empty result, and queue/claim reporting
- Withdrawn documents excluded from `get_queue`; surfaced in `list_documents` only when explicitly asked for by status

## Out of scope

- Any write or promotion path — this work order adds read tools only
- Relay approval ([[REQ-041]] item 4), which REQ-041 requires be gated by its own decision first
- Structured receipts ([[REQ-041]] item 3), which is its own work order
- New CLI commands; `veri next` already serves the terminal
- Full-text search changes — `search` keeps its current grammar
- Writing any skill that consumes these tools

## Requirements

- [[REQ-041]] — implements
- [[REQ-008]] — constrained-by

## Acceptance tests

- [ ] `list_documents` with no filters returns every non-withdrawn document; each filter narrows as specified and combines with the others
- [ ] `list_documents({status: 'draft'})` and `{status: 'proposed'}` together enumerate exactly the set `isPending` identifies
- [ ] `get_queue` returns ready work orders in the same order `veri next` prints, with the head first
- [ ] `get_queue` reports in-progress work orders with their claim holder and claim date
- [ ] Both tools refuse unknown parameter keys
- [ ] `veri check` passes with zero violations

## Receipts

(none yet)
