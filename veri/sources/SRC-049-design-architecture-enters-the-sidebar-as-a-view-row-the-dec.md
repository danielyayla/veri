---
id: SRC-049
type: source
title: "Design — Architecture enters the sidebar as a view row; the Decisions row stays a browser"
status: imported
created: 2026-08-25
updated: 2026-08-25
links:
  - id: SRC-036
    rel: builds-on
  - id: SRC-047
    rel: builds-on
  - id: SRC-014
    rel: builds-on
  - id: REQ-004
    rel: designs
  - id: DEC-012
    rel: constrained-by
---

> Drafted 2026-08-25 by an agent session (Claude Code) from Daniel's
> design-critique prompt: should Decisions mirror the WO-103 pattern —
> collection row toggles the panel, a promoted row atop it opens an
> Architecture tab? Written spec only; awaiting Daniel's approval.

## The question

WO-103 ([[SRC-047]], DEC-105 as revised) settled the Work Orders
entry: the collection row stays a panel toggle, and a promoted
`▤ Board` row atop the panel opens the board as a view tab. Daniel
asked whether Decisions should mirror this — an `Architecture` row
atop the Decisions panel opening the Architecture view.

## Ruling proposed: no mirror. Architecture becomes a sidebar view row.

The Board row is justified because the board is a **projection of the
same collection** — the same work-order documents in a four-status
kanban. Architecture is not a projection of decisions. Its primary
experience (the Map, [[SRC-036]]) is mostly *discovered* content —
observed imports, the module registry, the file drill-down — with
decisions contributing only the declared (gold) overlay. Nesting it
under Decisions would:

1. mislabel the content (a row named for system structure opening a
   panel of DEC documents, or vice versa);
2. hide the view from anyone thinking "how is this system built?"
   rather than "what did we decide?";
3. force a conditional row (Architecture renders only with a
   non-empty module registry) atop exactly one of four otherwise
   identical collection panels.

Instead, Architecture takes the promotion [[SRC-036]] explicitly left
open: *"promoting it later must cost only a sidebar item."*

## The sidebar row

- `⌗ Architecture` — the glyph and label already in `VIEW_META`
  (`tabs.ts`), rendered with the existing `viewItem` anatomy
  (SRC-014); no new row grammar.
- Position: below the four collections, where Board and Graph sat
  before WO-052/WO-053 — view rows above the fold, Settings at the
  foot unchanged.
- Click = `openArchitecture()` — the existing one-instance preview
  tab; selecting it closes any open type panel (the SRC-014 rule).
  Active state mirrors Home/Settings (`nav-item-active` when the
  architecture tab is the active target).
- **Always rendered**, registry or not. An empty registry opens the
  view's existing empty-state card (the DEC-059 CLI hint) — the row
  is how the feature is discovered. An appearing/disappearing nav row
  would undermine spatial memory and make the sidebar lie about the
  app's capabilities.
- The Home ARCHITECTURE card, ⌘K entry, and `architecture ↗`
  affordances all remain; the row supplements, replaces nothing.

## Rejected alternatives

- **Strict symmetry — an `⌗ Architecture` row atop the Decisions
  panel** (the prompt's proposal). Rejected: fails the projection
  test above; the WO-103 critique's own rule ("collections are
  browsers, view rows are routes") argues for a view row, not a
  collection sub-row, once the view merits sidebar presence.
- **A `Rules` row atop the Decisions panel** opening Architecture's
  Rules tab. The lattice *is* decision-derived, so the projection
  test passes — but [[SRC-036]] deliberately made Rules secondary to
  the Map, and a sidebar path that lands on the secondary surface
  inverts that hierarchy. Revisit only if use shows the lattice is
  the daily surface.
- **Conditional row** (render only with a non-empty registry).
  Rejected above — the empty state is the teaching surface.
- **Status quo** (Home card + ⌘K only). Rejected by the premise:
  Daniel is asking for a persistent entry, and SRC-036 already
  anticipated promotion.

## Not a reversal of SRC-024

Graph left the sidebar because the global view was illegible at
document scale. Architecture's Map is module-scale (a handful of
registry entries), windowed by design; it does not share that
failure mode.

## Everything unchanged

The Decisions row (and all four collection rows) stay plain panel
toggles. The Work Orders panel's ▤ Board row, tab semantics
([[SRC-047]]), the Architecture view's internals ([[SRC-036]]), and
all tokens are untouched. No new colors, glyphs, or row anatomy.

## Files

- `design/architecture-view/README.md` — Placement section updated to
  point here (was "deliberately provisional").
