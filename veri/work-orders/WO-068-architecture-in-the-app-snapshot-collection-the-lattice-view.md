---
id: WO-068
type: work-order
title: "Architecture in the app: the map, the rules view, and violation surfacing"
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
  - id: WO-069
    rel: depends-on
  - id: DEC-058
    rel: constrained-by
  - id: DEC-060
    rel: constrained-by
  - id: DEC-061
    rel: constrained-by
  - id: DEC-062
    rel: constrained-by
  - id: DEC-025
    rel: constrained-by
  - id: DEC-012
    rel: constrained-by
---

## Summary

Brings the architecture feature ([[REQ-022]]) into the desktop app per the design in [[SRC-036]] (`design/architecture-view/`), reshaped by Daniel's review: **the map is the primary experience — governance is an overlay, not the model.** The Electron main process becomes the second host of the DEC-040 split: it collects import facts (and entry-point exports) on snapshot rebuild with the CLI's collectors (an allowed ui → cli edge per [[DEC-060]], the DEC-016 precedent); the snapshot carries the compiled `ArchProjection`, the observed edge list with per-file detail, and violations routed by declared severity ([[DEC-062]] via [[WO-069]]) into the existing issues/advisories arrays. The Architecture view opens as a tab with two internal tabs. **Map (primary)**: modules as cards with purposes on a depth-layered canvas; edges encoded by provenance — solid grey for discovered imports, dashed gold for declared rules, never blurred — with violation and conflict markers by tier; selecting a module reveals responsibilities (declared · registry), public interface (discovered · exports), governing decisions and related requirements (declared), dependencies and dependents with provenance chips, and a contents drill-down system → module → directory → file → its imports. **Rules (secondary)**: the N×N lattice for allowed/forbidden/conflicting/violated questions, with ISSUES (conflicts + error-severity violations), VIOLATIONS (advisory tier), CONSTRAINTS (with severity badges), and MODULES cards. Entry points — a Home ARCHITECTURE card, ⌘K, and `architecture ↗` affordances — are the **provisional** proposal per SRC-036: nothing may depend on the entry point, and promoting Architecture to primary navigation later must cost only a sidebar item. Reader additions per the design: the constraints card with severity and observed status on decisions carrying an `architecture:` block, and advisory-strip lines with `architecture ↗`.

## In scope

- Main-process collection on the debounced snapshot pipeline (SRC-031): import facts via the CLI collector, entry-point export discovery at the same line-heuristic tier, per-file edge detail for the drill-down; snapshot gains `architecture: ArchProjection` plus observed edges, violations routed by severity into issues/advisories
- The Map tab: depth-layered module cards, provenance-encoded edges (grey observed / gold declared, violation markers by severity, conflict marker), persistent provenance legend, and the module detail panel with all five sections and the contents drill-down; a deterministic auto-layout, filed as a decision if non-trivial
- The Rules tab: the lattice with all cell states (forbidden, allowed, unconstrained, violated-advisory, violated-error, conflicted), ISSUES, VIOLATIONS, CONSTRAINTS (severity badges), and MODULES cards, empty states and the module-path skip rendering per SRC-036
- Optional additive `responsibilities:` list on registry entries feeding the detail panel (schema addition filed as a proposed DEC, WF-001 rule 4)
- Home ARCHITECTURE card (registry-gated) and ⌘K palette entry, documented as provisional placement
- Reader: ARCHITECTURE CONSTRAINTS card (edge, verdict, severity, observed status); `arch-violation` advisory-strip lines with the `architecture ↗` affordance; error-severity violations reaching the existing amber issue banner
- HEALTH card and sidebar verified: arch issues and advisories flow through the existing SRC-010 pipelines with no new design
- Tests alongside touched modules in the existing `*.test.ts` convention (derive logic, view rendering, snapshot merge)

## Out of scope

- The severity mechanism itself — schema, check semantics, CLI ([[WO-069]] delivers it first; this WO renders what the snapshot carries)
- Editing constraints or the module registry from the view — files are the write path (DEC-002)
- Force-directed/physics layout; the layered canvas and the matrix are the v1 visualizations
- An inventory surface for allowed or unconstrained observed edges (same exclusion as WO-067)
- Violation dismissal, muting, or acknowledgement state
- Submodule-level constraints or hierarchical module ids (flat per DEC-058's survey)
- Promoting Architecture to primary navigation — deliberately open; revisit after use
- Any MCP or context-package change: packages stay byte-identical and subprocess-free (DEC-037, DEC-038)

## Requirements

- [[REQ-022]] — implements
- [[REQ-004]] — implements
- [[SRC-036]] — designed-by
- [[WO-069]] — depends-on
- [[DEC-062]] — constrained-by

## Acceptance tests

- [ ] The snapshot carries the projection, per-file observed edges, and severity-routed violations, collected by the main process and refreshed on rebuild — no renderer filesystem access
- [ ] The Map is the view's default tab: modules with purposes, provenance-encoded edges with the persistent legend, and every relationship visibly declared, discovered, or both — never ambiguous
- [ ] Selecting a module reveals responsibilities, public interface, governing decisions, related requirements, dependencies, and dependents, each section labeled with its provenance; the contents drill-down walks module → directory → file → imports
- [ ] The Rules tab renders the lattice with all six cell states; rule cells navigate to their governing decision
- [ ] Advisory-severity violations render grey and hollow everywhere and never alter the chip, health colors, or issue counts; error-severity violations and conflicts render amber and reach the HEALTH card and chip through the existing issue pipeline
- [ ] A conflicted edge shows no violation rows at any severity (DEC-061)
- [ ] The Home ARCHITECTURE card appears only when the registry is non-empty and opens the Map; entry points match SRC-036 and are documented as provisional
- [ ] A decision carrying an `architecture:` block shows the reader constraints card with severity and observed status; its advisory violations appear as strip lines opening the Architecture view
- [ ] Empty states match the design: no registry → declare-modules hint; missing module path → ghosted card / skip note, never an error; clean scan → the explicit checked-and-clean line
- [ ] `veri check` reports zero issues across the corpus and all tests pass

## Receipts

(none yet)
