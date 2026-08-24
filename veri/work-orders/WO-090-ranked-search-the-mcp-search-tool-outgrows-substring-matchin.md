---
id: WO-090
type: work-order
title: "Ranked search: the MCP search tool outgrows substring matching"
status: in-progress
created: 2026-08-24
updated: 2026-08-24
links:
  - id: REQ-003
    rel: extends
  - id: REQ-018
    rel: consistent-with
  - id: REQ-017
    rel: extends
---

## Summary

The agent-facing MCP `search` tool is a case-insensitive substring scan over id, title, and body (packages/mcp/src/search.ts), returning id-ordered hits with no ranking. At this repo's own scale (240 documents) a common-word query returns dozens of undifferentiated hits, and the agent's retrieval path degrades exactly where [[REQ-018]] promises the context contract stays good. The UI's command palette already solved this (WO-013's ranked palette matcher in the same file) — but the MCP tool never adopted it, so agents get strictly worse retrieval than humans. This WO brings ranked, zero-dependency search to the MCP `search` tool and the CLI, reusing the palette's proven scoring core: title/id boost over body hits, whole-word over substring, and deterministic ordering (score, then id) so identical corpora give identical results. No database, no index files, no semantic embeddings — the corpus loads per call as today ([[DEC-009]]: no second index).

## In scope

- A shared ranking core in packages/mcp/src/search.ts (or hoisted to core if the CLI needs it): scored matching with title/id boost, whole-word bonus, multi-term AND-matching with per-term scoring, deterministic tie-break by id
- The MCP `search` tool returns hits ranked by score with the existing shape (id, type, status, title, matched) plus a score or rank field; result count capped with the cap stated in the tool description
- The palette matcher and the MCP tool share one scoring implementation — no second algorithm to drift
- `veri search <query>` CLI parity if a search command exists; if none exists, expose ranked search through an existing surface only (no new surface design)
- Tests: ranking-order assertions (title hit beats body hit, whole word beats substring, multi-term beats single-term), determinism (same corpus → identical ordering), and backward compatibility (every substring hit still returned unless capped)

## Out of scope

- Semantic/embedding search, fuzzy edit-distance matching beyond simple prefix/word handling
- Any persistent index, cache file, or database ([[DEC-009]])
- Context-package assembly changes ([[REQ-018]] is the neighboring contract, not this WO's ground)
- UI changes beyond the palette silently benefiting from the shared core

## Requirements

- [[REQ-003]] — extends
- [[REQ-018]] — consistent-with
- [[REQ-017]] — extends

## Acceptance tests

- [ ] A title-word query against the dogfood corpus ranks the title-matching document first, above body-only matches, with the previous substring behavior's full recall preserved (every old hit still present unless the stated cap truncates)
- [ ] The MCP tool and the command palette produce their ordering from one shared scoring function (verified by import graph, not code similarity)
- [ ] Ranking is deterministic: two runs over the same files return byte-identical results
- [ ] npm test green including new ranking tests; veri check zero issues

## Receipts

(none yet)
