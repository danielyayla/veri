---
id: WO-052
type: work-order
title: "A local graph on the document; retire the global view"
status: done
created: 2026-08-19
updated: 2026-08-19
links:
  - id: REQ-004
    rel: implements
  - id: SRC-024
    rel: designed-by
  - id: SRC-016
    rel: derived-from
---

## Summary

The global Graph view — "a columnar hairball … decorative at 100 docs and dead at 500" ([[SRC-016]]) — is retired, and the graph moves to where it stays legible: a compact 1-hop neighborhood map at the top of the Connections panel, per [[SRC-024]]. Center node is the current document; neighbors (the panel's own deduped set) fan inbound-left/outbound-right as type-colored buttons with the [[SRC-021]] hover previews, capped at 8 per side with a `+K more` pointer at the cards below. The `graph` ViewKey, view, layout, styles, and state are removed; tabs holding `graph` restore away via the WO-049 mechanism. [[REQ-004]] is amended (screen 4 retired) — the post-stamp edit surfaces as a drift advisory until Daniel re-stamps; the retirement is filed as a proposed decision.

## In scope

- The local graph in `connectionsPanel` (reader and editor screens both): deterministic two-column fan, SVG edges, real-button nodes with click/⌘-click `openDoc` semantics and `attachPreview` hover/focus, superseded dimming, 8-per-side cap with `+K more`, hidden when no connections
- Removal of the global view: `graph` ViewKey/`VIEW_META`, sidebar entry, render-switch arm, `graphSel` state and `.gr-pop` escape layer, `views/graph.ts`, `graphLayout` in `derive.ts`, `.screen-graph`/`.gr-*` styles, related tests
- A test that tabs holding `graph` targets restore away (the `retainTabs` path)
- Amend [[REQ-004]] body: screen 4 retired per SRC-024
- File the retirement as a proposed decision (DEC → this WO, `constrains`)

## Out of scope

- Board (its own order, [[SRC-025]])
- Any force simulation, zoom, pan, or global-graph replacement
- Changes to the Connections cards, `connections()` derivation, or preview timing
- New tokens or colors

## Requirements

- [[REQ-004]] — implements
- [[SRC-024]] — designed-by
- [[SRC-016]] — derived-from

## Acceptance tests

- [x] A document with inbound and outbound links shows the local graph above its Connections cards in both reader and editor screens; nodes navigate (click preview, ⌘-click background) and preview on hover/focus
- [x] A document with more than 8 neighbors on a side shows exactly 8 plus `+K more`; a document with none shows no graph
- [x] The Graph view is gone: no ViewKey, sidebar entry, palette row, or render arm; a persisted `graph` tab target restores away cleanly (test)
- [x] REQ-004 amended; `veri check` reports the expected drift advisory for it and zero issues; full typecheck and test suite pass

## Receipts

- 2026-08-19 — a315cde — packages/ui/src/renderer/derive.ts, packages/ui/src/renderer/views/reader.ts, packages/ui/src/renderer/tabs.ts, packages/ui/src/renderer/app.ts, packages/ui/src/renderer/views/graph.ts, packages/ui/renderer/styles.css, packages/ui/src/renderer/derive.test.ts, packages/ui/src/renderer/tabs.test.ts, veri/requirements/REQ-004-desktop-ui.md, veri/decisions/DEC-048-retire-the-global-graph-view-the-graph-is-local-to-the-docum.md — Agent session (Claude Code): built the local 1-hop graph atop the Connections panel (pure localGraph fan in derive.ts, real-button nodes with SRC-021 previews, 8-per-side cap with +K more, hidden at zero connections) and retired the global Graph view — ViewKey, sidebar item, render arm, graphSel/.gr-pop layer, views/graph.ts, graphLayout, and .gr-* styles removed; persisted graph tabs restore away via retainTabs (tested); REQ-004 amended per SRC-024; retirement filed as proposed DEC-048; typecheck clean, 397 tests green, veri check 0 issues with only the expected REQ-004 drift advisories.
