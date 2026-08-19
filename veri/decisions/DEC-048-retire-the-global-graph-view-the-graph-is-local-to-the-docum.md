---
id: DEC-048
type: decision
title: "Retire the global Graph view; the graph is local to the document"
status: proposed
created: 2026-08-19
updated: 2026-08-19
links:
  - id: WO-052
    rel: constrains
---

## Choice

The global Graph screen (views/graph.ts, the `graph` ViewKey/VIEW_META entry, sidebar item, palette row, `graphSel` state, `.gr-*` styles, and `graphLayout` in derive.ts) is removed. In its place, a compact 1-hop neighborhood map renders at the top of the Connections panel on every document (reader and editor screens): center node the current document, the panel's own deduped connections fanned inbound-left / outbound-right as type-colored real-button nodes with the SRC-021 hover previews, straight SVG edges, a deterministic two-column fan layout (pure `localGraph` in derive.ts, no simulation), superseded neighbors dimmed, capped at 8 per side with a `+K more` marker pointing at the complete card list below, and hidden entirely when a document has no connections. Persisted tabs holding a `graph` target restore away via `retainTabs` — no migration, verified by test (the WO-049 `decisions` precedent).

## Rejected alternatives

- **Keep the global view and add zoom/filter** — SRC-016's verdict stands: a columnar hairball is "decorative at 100 docs and dead at 500"; zoom and filter add machinery to a lens that answers no recurring question, and the manifesto rule applies — anything that lists everything must filter, window, or die.
- **A windowed global view (e.g. ego-graph with depth control, or type-filtered subgraphs)** — still a separate screen competing with the type panels and search as a third redundant lens; the navigation questions it would answer are already answered where the reader stands, and a depth/filter UI is force-simulation-adjacent scope SRC-024 explicitly excludes.
- **No graph anywhere** — the 1-hop neighborhood genuinely answers "what surrounds this document?" at the only scale where a graph stays legible, and it reuses the panel's existing derivation and preview machinery at near-zero cost.

## Rationale

SRC-016 found the global Graph one of three redundant lenses and put it on the remove-50% list; its P2 line asks for a local graph on the document in its place. A graph earns its pixels only at the scale where it stays legible — one document's neighborhood (SRC-024). Placing it in the Connections panel makes it an overview of the cards it sits above — same deduped set, same order, same click and preview semantics — so it adds orientation without adding a new navigation surface, new state, or new tokens.
