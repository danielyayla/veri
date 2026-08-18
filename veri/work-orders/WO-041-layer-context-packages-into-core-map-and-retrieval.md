---
id: WO-041
type: work-order
title: Layer context packages into core, map, and retrieval
status: backlog
created: 2026-08-18
updated: 2026-08-18
links:
  - id: REQ-018
    rel: implements
  - id: DEC-035
    rel: follows-from
  - id: SRC-017
    rel: designed-by
---

## Summary

A context package is currently everything within an undirected 2-hop
walk, full bodies, no budget — size is an emergent property of graph
density, and everything at hop 3 is silently invisible. Restructure
assembly per [[DEC-035]]: a guaranteed core (workflow, the work order,
and every document the approval gate reasons about, always in full), a
map enumerating the rest of the neighborhood by id, title, and relation,
and retrieval via the agent tools from [[WO-040]] for anything beyond.
Determinism, reproducibility, and human/agent parity are contract
properties and must survive the change.

## In scope

- Splitting `assembleContext` into the three layers, with the inline
  threshold DEC-035 sets (~15k tokens) as the size-based switch between
  inlining and enumerating non-binding neighbors.
- The map layer: one line per enumerated document — id, title, and how
  it connects — so nothing in the neighborhood is invisible.
- Byte-identical determinism for identical inputs, including across the
  threshold switch; the token figures become enforced levers.
- Updating the UI package panel to show exactly what is served,
  distinguishing inlined from enumerated documents.
- Tests: binding set never truncated at any corpus size; bounded growth
  against a dense synthetic corpus; determinism.

## Out of scope

- The retrieval tools themselves ([[WO-040]] builds them; this order
  depends on that landing first).
- Ranking, embeddings, or any non-deterministic relevance scoring —
  rejected by DEC-035.
- Changing the 2-hop neighborhood definition itself.

## Requirements

Implements [[REQ-018]] — the binding set always arrives whole, package
size is bounded, and nothing relevant is silently invisible.

## Acceptance tests

- [ ] The binding set (workflow, work order, gate-relevant documents)
      arrives in full at every corpus size; no budget can truncate it.
- [ ] Against a dense synthetic corpus, package tokens grow with the
      work order's direct neighborhood, not corpus size.
- [ ] Every neighborhood document not inlined appears in the map with
      id, title, and relation.
- [ ] Identical files produce byte-identical packages, on both sides of
      the inline threshold.
- [ ] The package panel shows inlined vs enumerated exactly as served.
- [ ] Full suite and `veri check` clean.

## Receipts

- 2026-08-18 — fc44d8c — packages/core/src/schema.ts, packages/mcp/src/context.ts (+tests) — layered assembly per [[DEC-035]]: INLINE_THRESHOLD_TOKENS in core, byte-identical inline mode under it, core + context map over it (WO-028 live: ~19.8k → ~10.1k tokens, 66 mapped); 272 tests pass; panel update pending design approval of [[SRC-017]] (agent session, Claude Code)
