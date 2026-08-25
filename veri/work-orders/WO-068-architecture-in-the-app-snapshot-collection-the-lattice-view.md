---
id: WO-068
type: work-order
title: "Architecture in the app: the map, the rules view, and violation surfacing"
status: done
created: 2026-08-20
updated: 2026-08-25
binds:
  paths:
    - packages/ui/src/renderer/archderive.ts
    - packages/ui/src/renderer/views/architecture.ts
    - packages/ui/src/lib/snapshot.ts
    - packages/cli/src/imports.ts
  tests:
    - packages/ui/src/renderer/archderive.test.ts
    - packages/ui/src/renderer/views/architecture.test.ts
    - packages/ui/src/lib/snapshot.test.ts
    - packages/cli/src/imports.test.ts
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

- [x] The snapshot carries the projection, per-file observed edges, and severity-routed violations, collected by the main process and refreshed on rebuild — no renderer filesystem access (the sidecar — DEC-063's main-process role — collects in lib/snapshot.ts's collectArchitecture on both buildSnapshot and the incremental builder; snapshot.test.ts "carries the projection and per-file observed facts" and the error/advisory routing tests; the renderer reads only `architecture`/`archObserved`)
- [x] The Map is the view's default tab: modules with purposes, provenance-encoded edges with the persistent legend, and every relationship visibly declared, discovered, or both — never ambiguous (archTab defaults to 'map'; solid-grey observed vs dashed-gold declared strokes with the always-rendered legend row naming each source; dep rows carry observed / declared + observed chips — archderive.test.ts "moduleDeps carries provenance chips")
- [x] Selecting a module reveals responsibilities, public interface, governing decisions, related requirements, dependencies, and dependents, each section labeled with its provenance; the contents drill-down walks module → directory → file → imports (detailPanel's five dt-sec sections with declared·registry / discovered·exports / declared·decisions / discovered·imports / discovered·file-tree tags; listDir walk tested in archderive.test.ts "listDir walks module → directory → file → imports")
- [x] The Rules tab renders the lattice with all six cell states; rule cells navigate to their governing decision (latticeCell + cellRender cover self, unconstrained, allowed, forbidden, violated-advisory, violated-error, conflicted — archderive.test.ts "all six states" and architecture.test.ts; rule cells are buttons opening cell.decisionId)
- [x] Advisory-severity violations render grey and hollow everywhere and never alter the chip, health colors, or issue counts; error-severity violations and conflicts render amber and reach the HEALTH card and chip through the existing issue pipeline (routing lands advisory findings in snapshot.advisories only — snapshot.test.ts asserts issues stay empty; error findings join snapshot.issues, which the existing chip/HEALTH counts already read; adv-ring vs arch-errdot throughout; archderive.test.ts "never alter the issue count")
- [x] A conflicted edge shows no violation rows at any severity (DEC-061) (core suppresses before the split — WO-069 — and the view re-derives nothing: the conflict cell carries no count, the CONSTRAINTS card replaces the pair with an ISSUES pointer; archderive.test.ts "a conflicted edge shows no violation rows")
- [x] The Home ARCHITECTURE card appears only when the registry is non-empty and opens the Map; entry points match SRC-036 and are documented as provisional (home.ts renders the card only when archSummary.modules > 0, onClick openArchitecture('map'); ⌘K row via VIEW_META, architecture ↗ affordances in the reader; provisional placement documented at every entry point — tabs.ts, app.ts openArchitecture, the view header)
- [x] A decision carrying an `architecture:` block shows the reader constraints card with severity and observed status; its advisory violations appear as strip lines opening the Architecture view (reader.ts cs-card from decisionRules — frontmatter-derived, so proposed decisions show too; severity badge + ring/dot/✓ observed status; arch-violation strip lines swap template ↗ for architecture ↗; archderive.test.ts decisionRules tests, and derive.ts anchors arch-violation issues to the governing decision for the amber banner)
- [x] Empty states match the design: no registry → declare-modules hint; missing module path → ghosted card / skip note, never an error; clean scan → the explicit checked-and-clean line (the DEC-059 hint card when modules is empty; skipped modules render arch-mod-ghost with "not on disk — skipped" from archObserved.skipped — snapshot.test.ts skip test; the ✓ clean lines on the Home card and the VIOLATIONS card)
- [x] `veri check` reports zero issues across the corpus and all tests pass (253 documents, 0 issues, 1 known WO-034 receipt-prefix advisory; npm test green across all five workspaces — 621 tests: action 10, cli 45, core 188, mcp 64, ui 314)

## Receipts

- 2026-08-25 — 00eac83 — packages/cli/src (imports.ts, imports.test.ts, index.ts), packages/core/src (schema.ts, architecture.test.ts), packages/ui/src/lib (snapshot.ts, snapshot.test.ts), packages/ui/src/renderer (archderive.ts, archderive.test.ts, app.ts, derive.ts, derive.test.ts, tabs.ts, palette.ts, views/architecture.ts, views/architecture.test.ts, views/home.ts, views/reader.ts), packages/ui/renderer/styles.css, action/dist/index.js, veri/decisions (DEC-087, DEC-088, DEC-089), veri/ids — the sidecar collects the projection, per-file import facts, and entry-point exports on every debounced rebuild and routes violations by declared severity into the snapshot's issues/advisories; the Architecture tab ships the depth-layered Map with the module detail panel and contents drill-down, the Rules lattice with its four cards, the registry-gated Home card, the ⌘K entry, and the reader constraints card with architecture ↗ strip lines; DEC-087 (export discovery), DEC-088 (map layout), DEC-089 (registry responsibilities) filed as proposed.
