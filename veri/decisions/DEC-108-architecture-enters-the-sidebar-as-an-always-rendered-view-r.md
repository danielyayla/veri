---
id: DEC-108
type: decision
title: "Architecture enters the sidebar as an always-rendered view row; collection rows stay browsers"
status: active
approved: 2026-08-25
created: 2026-08-25
updated: 2026-08-25
links:
  - id: SRC-049
    rel: derived-from
  - id: SRC-036
    rel: amends
  - id: REQ-004
    rel: constrains
---

## Choice

The Architecture view gains a persistent sidebar view row (`⌗ Architecture`, below the four collections, existing `viewItem` anatomy) that opens the existing one-instance Architecture tab. It renders unconditionally — an empty module registry opens the view's empty-state card. The Decisions collection row remains a plain panel toggle; no promoted row is added to the Decisions panel. This resolves the placement SRC-036 left "deliberately provisional."

## Rejected alternatives

- **An `Architecture` row atop the Decisions panel (strict WO-103 symmetry)** — fails the projection test; a system view nested under one collection mislabels both surfaces.
- **A `Rules` row atop the Decisions panel** — the lattice is decision-derived, but SRC-036 made Rules secondary to the Map; a sidebar path landing on the secondary surface inverts that hierarchy.
- **Conditional rendering (row only when the registry is non-empty)** — appearing/disappearing nav rows undermine spatial memory; the empty state is the discovery surface.
- **Status quo (Home card + ⌘K only)** — Daniel's prompt asks for a persistent entry, and SRC-036 anticipated the promotion.

## Rationale

The WO-103 pattern (a promoted row atop a collection panel) is earned only when the promoted view is a projection of that collection's documents — the Board is work orders re-projected. Architecture is a system view whose primary content is discovered from the repository; decisions supply only the declared overlay. Filing it under Decisions would mislabel the content and hide it from users reasoning about structure rather than governance. SRC-036 pre-priced this promotion: "promoting it later must cost only a sidebar item." An always-rendered row keeps spatial memory intact and lets the empty state teach the feature. See SRC-049 for the full argument.
