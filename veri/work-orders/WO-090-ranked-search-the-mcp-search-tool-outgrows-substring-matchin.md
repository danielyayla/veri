---
id: WO-090
type: work-order
title: "Ranked search: the MCP search tool outgrows substring matching"
status: done
created: 2026-08-24
updated: 2026-08-24
links:
  - id: REQ-003
    rel: extends
  - id: REQ-018
    rel: consistent-with
  - id: REQ-017
    rel: extends
binds:
  paths:
    - packages/mcp/src/**
    - site/docs/**
  tests:
    - packages/mcp/src/search.test.ts
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

- [x] A title-word query against the dogfood corpus ranks the title-matching document first, above body-only matches, with the previous substring behavior's full recall preserved (every old hit still present unless the stated cap truncates) (dogfood test in packages/mcp/src/search.test.ts runs "brownfield" against this repo's veri/, asserts title hits above body-only and recall equal to a manual substring scan; live JSON-RPC call against the built server ranked REQ-024 at score 250 above body-only WO-091 at 80)
- [x] The MCP tool and the command palette produce their ordering from one shared scoring function (verified by import graph, not code similarity) (packages/mcp/src/server.ts imports paletteSearch from ./search.ts and packages/ui/src/sidecar/app.ts imports paletteSearch from @veri/mcp — both reach the one rankDocs; no second scorer exists)
- [x] Ranking is deterministic: two runs over the same files return byte-identical results (search.test.ts asserts JSON-identical output across two corpus loads and across reversed document input order; sort key is score then compareIds, a total order)
- [x] npm test green including new ranking tests; veri check zero issues (578 tests pass across all five workspaces including 7 new ranking/determinism/recall tests; veri check: 247 documents, 0 issues, 1 pre-existing WO-034 advisory)

## Receipts

- 2026-08-24 — 2cfcc06 — packages/mcp/src (search.ts, search.test.ts, server.ts, server.e2e.test.ts), packages/ui/src/renderer (palette.ts, palette.test.ts, searchview.test.ts), site/docs (reference.html, connect-claude-code.html), veri/decisions/DEC-083, veri/ids — multi-term AND ranking with whole-word bonus and matched field in the shared rankDocs core; MCP search returns score+matched capped at a stated top 25; palette view-row constant recalibrated; DEC-083 filed as proposed. Note: the summary's premise predates DEC-044 — the MCP tool already shared paletteSearch; this session delivered the missing ranking depth (whole-word, multi-term, score surface, cap).
