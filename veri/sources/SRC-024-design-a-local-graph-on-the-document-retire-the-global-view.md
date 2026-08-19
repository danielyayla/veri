---
id: SRC-024
type: source
title: Design — A local graph on the document; retire the global view
status: imported
created: 2026-08-19
updated: 2026-08-19
links:
  - id: REQ-004
    rel: designs
  - id: SRC-021
    rel: builds-on
  - id: SRC-016
    rel: derived-from
  - id: DEC-012
    rel: constrained-by
  - id: REQ-020
    rel: constrained-by
---

> Drafted 2026-08-19 by an agent session (Claude Code) for the local
> graph work order, per the DEC-012 design gate, under Daniel's P2
> implementation directive. Pending Daniel's review. Written spec only.

[[SRC-016]]: the global Graph is "a columnar hairball with no
zoom/filter that is decorative at 100 docs and dead at 500", one of
three redundant lenses, and on the remove-50% list; the P2 line asks
for a **local graph on the document** in its place. A graph earns its
pixels only at the scale where it stays legible — one document's
neighborhood (manifesto 10: anything that lists everything must
filter, window, or die).

## The local graph

A compact neighborhood map at the top of the Connections panel
(`.panel-right`, rendered by `connectionsPanel` in `views/reader.ts` —
so it appears in both reader and editor screens, which share that
panel):

- **Center node**: the current document, its id in its type color.
- **Neighbor nodes**: the same deduped 1-hop set the cards below list
  (`connections()` in `derive.ts` — outbound left... no: **outbound
  right, inbound left**, matching reading order "linked from → doc →
  links to"). Nodes are id-only dots+labels, type-colored, `dim` when
  superseded — the global view's visual vocabulary at local scale.
- **Edges**: straight SVG lines center↔neighbor. No simulation; the
  layout is a deterministic two-column fan computed from the neighbor
  count, like `graphLayout` was, at panel width.
- **Cap**: at most 8 neighbors per side, closest first in the panel's
  existing order; beyond that a final `+K more` marker points at the
  cards below. The cards remain the complete list.
- **Interaction**: every node is a real `<button>` ([[REQ-020]]):
  click opens the doc (preview tab), ⌘-click background — `openDoc`
  semantics unchanged. Hover/focus shows the [[SRC-021]] preview
  popover via the existing `attachPreview` (`widgets.ts`) — the graph
  answers "do I need to go there?" without leaving the panel.
- Hidden entirely for documents with no connections; no empty-state
  art.

## Retiring the global view

Remove the `graph` ViewKey and `VIEW_META` entry (`tabs.ts`), the
sidebar entry, render-switch arm, `graphSel` state and `.gr-pop`
escape layer (`app.ts`), `views/graph.ts`, the `.screen-graph`/`.gr-*`
styles, and `graphLayout` in `derive.ts` (the local layout is new,
smaller code). The palette row disappears with `VIEW_META`; tabs
holding `graph` targets restore away via `retainTabs`, as WO-049
proved for `decisions`. Verify with a test, never a migration.

[[REQ-004]] is amended in the same change: screen 4 (Graph) is
retired; the local graph is a property of the document surface, not a
screen. The post-stamp edit surfaces as a drift advisory until Daniel
re-approves — the intended path. The retirement is filed as a
proposed decision for Daniel's stamp.

## Everything unchanged

The Connections cards (the local graph is an overview of them, not a
replacement), `connections()` derivation and its dedup, hover-preview
timing, chip and card click semantics, tokens and type colors.
