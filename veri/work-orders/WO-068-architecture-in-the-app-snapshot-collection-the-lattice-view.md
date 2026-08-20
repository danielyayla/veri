---
id: WO-068
type: work-order
title: "Architecture in the app: snapshot collection, the lattice view, and violation surfacing"
status: backlog
created: 2026-08-20
updated: 2026-08-20
links:
  - id: REQ-022
    rel: implements
  - id: REQ-004
    rel: implements
  - id: SRC-036
    rel: designed-by
  - id: DEC-058
    rel: constrained-by
  - id: DEC-060
    rel: constrained-by
  - id: DEC-061
    rel: constrained-by
  - id: DEC-025
    rel: constrained-by
  - id: DEC-012
    rel: constrained-by
---

## Summary

Brings the architecture feature ([[REQ-022]]) into the desktop app per the approved design in [[SRC-036]] (`design/architecture-view/`). The Electron main process becomes the second host of the DEC-040 split: it collects import facts on snapshot rebuild with the CLI's `collectImportFacts` (an allowed ui → cli edge per [[DEC-060]], the DEC-016 precedent), and the snapshot carries the compiled `ArchProjection` plus `arch-violation` advisories merged into the existing advisories array. Three surfaces render it, all in existing card grammar and tokens: an Architecture view opened as a tab (MODULE LATTICE matrix with per-cell click-through to governing decisions, CONFLICTS in warn-row grammar, an always-present VIOLATIONS card, CONSTRAINTS and MODULES cards) reached from a new Home ARCHITECTURE card, a ⌘K palette entry, and `architecture ↗` affordances; a reader constraints card on decisions carrying an `architecture:` block with per-rule observed status; and `arch-violation` lines in the SRC-010 advisory strip with `architecture ↗` in place of `template ↗`. The two-tier rule governs throughout ([[DEC-025]]): conflicts are amber issues that flow through the existing HEALTH pipeline; violations are grey, hollow, and never touch health colors or the topbar chip. The Home card and view honor the empty states the design fixes: no registry → no Home card and a declare-modules hint in the view; clean scan → an explicit "checked and clean" line, never an empty card.

## In scope

- Main-process collection: `collectImportFacts` over the registry on snapshot rebuild, scheduled with the debounced pipeline (SRC-031); snapshot gains `architecture: ArchProjection` and merges `arch-violation` advisories
- The Architecture view as a tab: lattice matrix (⨯ / ✓ / · glyphs, hollow-ring violation badges, amber conflict cells, tooltips and click-through per SRC-036), CONFLICTS, VIOLATIONS, CONSTRAINTS, and MODULES cards, including all three empty states and the module-path skip rendering
- Home ARCHITECTURE card between HEALTH and IN FLIGHT, rendered only when the registry is non-empty; ⌘K palette entry "Architecture"
- Reader: ARCHITECTURE CONSTRAINTS card on decisions with an `architecture:` block; `arch-violation` advisory-strip lines with the `architecture ↗` affordance
- HEALTH card and sidebar behavior verified unchanged: `arch-conflict` issues and `arch-violation` advisories flow through the existing SRC-010 pipelines with no new design
- Tests alongside touched modules in the existing `*.test.ts` convention (derive logic, view rendering, snapshot merge)

## Out of scope

- Editing constraints or the module registry from the view — files are the write path (DEC-002)
- A force-directed or graph rendering of the lattice; the matrix is the v1 visualization
- An inventory surface for allowed or unconstrained observed edges (same exclusion as WO-067)
- Violation dismissal, muting, or acknowledgement state
- Blocking severity for violations — needs its own decision first (DEC-025, WO-067)
- Any MCP or context-package change: packages stay byte-identical and subprocess-free (DEC-037, DEC-038)
- Changes to core or the CLI beyond consuming their existing exports

## Requirements

- [[REQ-022]] — implements
- [[REQ-004]] — implements
- [[SRC-036]] — designed-by
- [[DEC-058]] — constrained-by
- [[DEC-060]] — constrained-by
- [[DEC-061]] — constrained-by
- [[DEC-025]] — constrained-by
- [[DEC-012]] — constrained-by

## Acceptance tests

- [ ] The snapshot carries the compiled projection and arch-violation advisories, collected by the main process and refreshed on rebuild — no renderer filesystem access
- [ ] The Architecture view renders the lattice with all five cell states (forbidden, allowed, unconstrained, violated, conflicted); rule cells navigate to their governing decision
- [ ] Violations render grey and hollow everywhere and never alter the topbar chip, health colors, or issue counts; a conflict renders amber, reaches the HEALTH card, and summons the chip through the existing issue pipeline
- [ ] A conflicted edge shows no violation rows (DEC-061's unanimity rule)
- [ ] The Home ARCHITECTURE card appears only when the registry is non-empty, shows the modules · constraints meta with the separate grey violations span, and opens the view
- [ ] A decision carrying an `architecture:` block shows the reader constraints card with per-rule observed status; its arch-violation advisories appear as strip lines whose affordance opens the Architecture view
- [ ] Empty states match the design: no registry → declare-modules hint; no constraints → the quiet constraints line; clean scan → "observed imports respect every active constraint"
- [ ] A registry module whose path is not on disk renders the skip suffix in the MODULES card, never an error
- [ ] `veri check` reports zero issues across the corpus and all tests pass

## Receipts

(none yet)
