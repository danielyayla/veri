---
id: WO-106
type: work-order
title: "The palette query grammar and ranked matching move to core; mcp keeps the door and re-exports"
status: done
claimed_by: claude-wo106
claimed_at: 2026-08-26
approved: 2026-08-26
created: 2026-08-25
updated: 2026-08-26
links:
  - id: REQ-022
    rel: implements
  - id: DEC-060
    rel: constrained-by
  - id: DEC-009
    rel: relates-to
  - id: DEC-044
    rel: relates-to
  - id: WO-105
    rel: relates-to
---

## Summary

The ranked-search implementation the whole product shares — parsePaletteQuery, relatedIds, rankDocs, and the Palette* shapes — is pure domain logic over VeriDocument[], but it lives in packages/mcp/src/search.ts, a surface package whose registry charter is "the agent door". Core's charter ("pure domain logic over veri/") is its natural home, and the misplacement has a concrete cost: DEC-009 keeps shared logic in mcp "until a third consumer appears", yet the module lattice ([[DEC-060]]) makes that trigger unreachable — a future `veri search` CLI command cannot import from mcp (forbidden sideways edge), and the renderer cannot bundle mcp at all. This work order moves the pure grammar and ranking into a core module; mcp keeps searchDocs (its WO-003 substring semantics) and the paletteSearch IO wrapper, and re-exports the moved names so @verikb/mcp's public API — and the ui sidecar and renderer type imports — are byte-stable. Fifth in the deepening series; like [[WO-105]] it is preventive relocation, not a bug fix.

## In scope

- Core: a new pure module (search.ts) holding PaletteQuery, PaletteHit, PaletteResult, parsePaletteQuery, relatedIds, rankDocs, and their private helpers (score tiers, whole-word matcher, type-prefix and status-alias tables), moved verbatim from mcp; main-entry export
- MCP search.ts: keeps searchDocs and paletteSearch (the two IO-bearing, mcp-scoped functions) and re-exports the moved names from @verikb/core, so `import { … } from '@verikb/mcp'` resolves identically for every existing consumer (ui sidecar paletteSearch import, renderer PaletteResult/PaletteHit type imports, the MCP search tool)
- The pure ranking test suite (mcp search.test.ts: parse, rank tiers, multi-term AND scoring, related:, dogfood corpus, zero-strip) moves to core beside the code; mcp keeps its IO/tool-level coverage (searchDocs via writeback.test.ts, the search tool via server tests)
- No behavior change anywhere: same grammar, same tiers, same ordering, same wire output

## Out of scope

- assembleContext and searchDocs — they stay in mcp; [[DEC-009]]'s home argument for the assembly rules is untouched and its rejected alternative (moving assembly to core) stays rejected
- A `veri search` CLI command or renderer-local synchronous ranking — this work order opens those doors ([[DEC-060]]-cleanly) but walks through neither
- A ./search subpath export — no browser consumer exists; DEC-100's precedent (no speculative subpaths) applies
- Any change to the palette UI, the Search view, or the MCP search tool's wire shape

## Requirements

- [[REQ-022]] — implements
- [[DEC-060]] — constrained-by
- [[DEC-009]] — relates-to
- [[DEC-044]] — relates-to
- [[WO-105]] — relates-to

## Acceptance tests

- [x] parsePaletteQuery, relatedIds, and rankDocs are defined once, in core; mcp/search.ts holds only searchDocs, paletteSearch, and re-exports
- [x] The moved ranking suite runs in core (parse, tiers, AND scoring, related:, dogfood recall, zero-strip) — all green
- [x] `import { parsePaletteQuery, rankDocs, relatedIds } from '@verikb/mcp'` and the renderer's PaletteResult/PaletteHit type imports still resolve — no consumer file outside mcp/search.ts changes
- [x] Full suite and typecheck green across workspaces; veri check green (the observed-import scan sees no new edges)

## Receipts

- 2026-08-26 — ddb3faa — packages/core/src/{search.ts,search.test.ts,index.ts}, packages/mcp/src/search.ts (search.test.ts moved out) — parsePaletteQuery, relatedIds, rankDocs, and the Palette* shapes moved verbatim to a new pure core module per [[DEC-104]]; mcp keeps searchDocs and paletteSearch and re-exports the moved names, so no consumer file outside mcp/search.ts changed; the ranking suite runs in core (290 core tests), full suites green across core/mcp/cli/ui (290/56/58/338), typecheck clean everywhere, veri check 0 issues.
