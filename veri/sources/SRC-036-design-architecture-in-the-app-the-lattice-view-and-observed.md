---
id: SRC-036
type: source
title: "Design — Architecture in the app: the map, the rules view, and observed violations"
status: imported
created: 2026-08-20
updated: 2026-08-20
links:
  - id: REQ-022
    rel: designs
  - id: REQ-004
    rel: designs
  - id: DEC-025
    rel: designs
---

> Drafted 2026-08-20 by an agent session (Claude Code) at Daniel's
> request, per the DEC-012 design gate; revised the same day to
> Daniel's review: the map is the primary experience, governance is
> an overlay, provenance always visible, navigation provisional, and
> severity declared per rule ([[DEC-062]], proposed). Written spec
> plus interactive prototype; nothing implemented. Awaiting Daniel's
> approval before any code.

High-fidelity design handoff for surfacing architecture
([[REQ-022]], [[DEC-058]]) in the desktop app. Files live in
`design/architecture-view/`:

- `README.md` — self-sufficient written spec built on three rules:
  **the map is primary and governance is an overlay on it**;
  **provenance is always visible** — declared relationships render in
  decision gold, discovered ones in neutral grey, never blurred; and
  **severity is declared, not assumed** — conflicts and
  error-severity violations are amber issues, advisory violations
  stay grey and hollow ([[DEC-025]], [[DEC-062]]). The Architecture
  view opens as a tab (Home ARCHITECTURE card, ⌘K, `architecture ↗`
  affordances — explicitly a *provisional* placement; primary
  navigation stays open) with two internal tabs. Map: depth-layered
  module cards with purposes; solid-grey observed edges and
  dashed-gold declared rules with violation/conflict markers by tier;
  a module detail panel — responsibilities (declared · registry),
  public interface (discovered · exports), governing decisions and
  related requirements, dependencies/dependents with provenance
  chips, and a contents drill-down system → module → directory →
  file → imports. Rules: the N×N lattice for allowed / forbidden /
  conflicting / violated questions, with ISSUES, VIOLATIONS,
  CONSTRAINTS (severity badges), and MODULES cards. Reader additions:
  a constraints card (edge, verdict, severity, observed status) on
  decisions carrying an `architecture:` block, and SRC-010 strip
  lines with `architecture ↗`. Data: the Electron main process
  collects import facts and entry-point exports with the CLI's
  collectors (allowed ui → cli edge, DEC-060; hosts collect, core
  computes, [[DEC-040]]); the snapshot carries the projection,
  per-file observed edges, and severity-routed findings; scheduling
  follows the incremental-snapshots bundle.
- `architecture-view.html` — self-contained interactive prototype
  (open in a browser; illustrative "skiff" fixture content) with
  three toggles demonstrating the tiers: advisory violations move
  only the grey tier; an error-severity rule promotes its violation
  to an amber issue that summons the chip; a conflicting decision
  tints the lattice amber and — per [[DEC-061]] — silences the
  conflicted edge's violation entirely.

The spec introduces no new design tokens — every color, font, and
radius reuses the canon in `design/README.md`; shell and card grammar
extend the sidebar-navigation ([[SRC-014]]) and advisory-surfacing
([[SRC-010]]) bundles unchanged. Editing constraints from the view,
physics layouts, an allowed-edge inventory, violation muting,
hierarchical module ids, and the primary-navigation question are
explicitly deferred.
