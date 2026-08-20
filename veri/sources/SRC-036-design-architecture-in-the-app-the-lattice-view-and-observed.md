---
id: SRC-036
type: source
title: "Design — Architecture in the app: the lattice view and observed violations"
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
> request, per the DEC-012 design gate (every surface here lives in
> `packages/ui`). Written spec plus interactive prototype; nothing
> implemented. Awaiting Daniel's approval before any code.

High-fidelity design handoff for surfacing the intended architecture
([[REQ-022]], [[DEC-058]]) and its observed side ([[WO-067]]) in the
desktop app. Files live in `design/architecture-view/`:

- `README.md` — self-sufficient written spec built on the two-tier
  rule the advisory canon established: **conflicts are issues — amber
  and filled; violations are drift — grey and hollow** ([[DEC-025]]).
  It defines the Architecture view (opened as a tab from a new Home
  ARCHITECTURE card, a ⌘K palette entry, and `architecture ↗`
  affordances — the sidebar stays untouched): a MODULE LATTICE matrix
  (⨯ forbidden / ✓ allowed / · unconstrained, hollow-ring violation
  badges, amber conflict cells, every rule cell clicking through to
  its governing decision), a CONFLICTS card in warn-row grammar, an
  always-present VIOLATIONS card whose empty state says "checked and
  clean", a CONSTRAINTS card translating the `veri architecture`
  printout, and a MODULES card footed with the DEC-059 registry
  provenance. Decisions carrying an `architecture:` block gain a
  reader constraints card with per-rule observed status, and
  `arch-violation` advisories reuse the SRC-010 strip with an
  `architecture ↗` affordance — rule, status, and rationale on one
  screen. Data: the Electron main process collects import facts with
  the CLI's `collectImportFacts` (an allowed ui → cli edge, DEC-060;
  hosts collect, core computes, [[DEC-040]]); the snapshot carries the
  `ArchProjection` and merges violations into the existing advisories
  array; scheduling follows the incremental-snapshots bundle.
- `architecture-view.html` — self-contained interactive prototype
  (open in a browser; illustrative "skiff" fixture content) with two
  toggles demonstrating the tiers: observed violations move only the
  grey tier, while a conflicting decision summons the amber chip,
  tints the lattice cell, and — per [[DEC-061]]'s unanimity rule —
  silences the violation on the conflicted edge.

The spec introduces no new design tokens — every color, font, and
radius reuses the canon in `design/README.md`; shell and card grammar
extend the sidebar-navigation ([[SRC-014]]) and advisory-surfacing
([[SRC-010]]) bundles unchanged. Editing constraints from the view, a
graph rendering of the lattice, an allowed-edge inventory, violation
muting, and blocking severity are explicitly deferred to their own
designs and decisions.
