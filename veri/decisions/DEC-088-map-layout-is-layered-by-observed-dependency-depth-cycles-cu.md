---
id: DEC-088
type: decision
title: "Map layout is layered by observed dependency depth; cycles cut at the back-edge; registry order within a row"
status: active
approved: 2026-08-25
created: 2026-08-25
updated: 2026-08-25
links:
  - id: WO-068
    rel: constrains
  - id: DEC-058
    rel: follows-from
---

## Choice

The Architecture map ([[SRC-036]]) places module cards deterministically —
the design mandates "layered by dependency depth" and leaves the algorithm
to this work order, filed here because it is non-trivial.

**Depth over observed imports.** A module's depth is 0 when it imports no
registry module, otherwise 1 + the deepest module it imports, computed over
the observed (aggregated) edge set. Declared rules contribute nothing to
position: a forbidden edge is not a dependency, and an allowed rule with no
traffic describes intent, not structure — the map's geometry is discovered,
its overlays are declared, the same provenance split as every stroke.

**Cycles cut at the back-edge.** The depth walk visits modules in registry
order and edges in collected (deterministic, DEC-061) order; an edge that
would re-enter the active walk contributes depth 0 instead of recursing.
Cyclic modules therefore land on distinct-but-stable layers and the same
snapshot always renders the same picture (REQ-018's contract applied to
pixels).

**Rows top-down, registry order within a row.** Cards on row r depend on
cards below; within a row, modules keep the registry's declaration order.
Fixed card geometry (172×92) and constant gutters; the canvas scrolls
horizontally when a row outgrows the pane.

## Rejected alternatives

- **Force-directed / physics layout** — explicitly deferred by SRC-036 and
  the work order; non-deterministic output would make the same corpus
  render differently on every open.
- **Strongly-connected-component condensation (Tarjan) before layering** —
  the correct general treatment of cycles, but registry-scale graphs are
  single digits of nodes; the back-edge cut is deterministic, ~10 lines,
  and degrades only in how a cyclic pair stacks. Revisit if real registries
  produce misleading layers.
- **Layering by declared rules where observed edges are absent** — blurs
  provenance into geometry; a rule would move a card the repository gives
  no reason to move.
- **Persisted manual positions** — state the files don't hold (DEC-002),
  and a map you must garden is a map that goes stale.

## Rationale

"Things that depend sit above the things they depend on" is the entire
semantic content of the design's layout; longest-path depth delivers it in
one pure function whose determinism is testable (chain, diamond, and cycle
fixtures). Keeping declared rules out of the geometry preserves the one
rule the whole surface is built on: the UI never blurs what a human
asserted with what the repository shows.
