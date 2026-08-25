# Handoff: Architecture in the App

## Overview
Architecture in the desktop app, redesigned around one principle from
Daniel's review: **the map is the primary experience; governance is an
overlay on the model, not the model itself.** The main job of the
Architecture surface is to help a human understand the system's
structure and intent — what the modules are, what each is for, how
they relate — with progressive drill-down from system → module →
directory → file. Dependency rules, violations, conflicts, and drift
are overlays and a specialized secondary view, not the entry point.

Two further principles govern every pixel:

> **Provenance is always visible.** A relationship is *declared*
> (asserted by humans in approved decisions — rendered in decision
> gold), *discovered* (observed in the repository — rendered in
> neutral grey), or both. The UI never blurs the two.

> **Severity is declared, not assumed.** A conflict is an issue
> (amber, filled). A violation's tier follows its rule's declared
> severity: `advisory` renders grey and hollow (DEC-025's whisper),
> `error` renders amber, reaches the HEALTH pipeline, and fails
> `veri check` — see DEC-062 (proposed).

## About the Design Files
`architecture-view.html` is a **self-contained interactive prototype**
(open in a browser) on illustrative "skiff" fixture content — an
invoicing app with four modules. The view's segmented control switches
**Map | Rules**. Three prototype controls demonstrate the tier
semantics: *observed violations* moves only the grey tier; *DEC-006
severity: error* promotes that rule's violation to an amber issue that
summons the topbar chip; *conflicting decision* tints the lattice cell
amber and — per DEC-061's unanimity rule — silences the violation on
the conflicted edge until one decision is retired. It is a design
reference, not production code. All tokens reuse the canon
(`design/README.md`); shell and card grammar extend the
sidebar-navigation (SRC-014) and advisory-surfacing (SRC-010) bundles
unchanged.

## Fidelity
**High-fidelity for tokens, tier semantics, provenance encoding, and
the anatomy of both tabs.** The map's node layout algorithm is
illustrative (the prototype hand-places four modules); the
implementing work order chooses a deterministic auto-layout (layered
by dependency depth) and files it as a decision if non-trivial.

## Placement
**Resolution proposed 2026-08-25** (SRC-049, DEC-108, WO-107 — pending
Daniel's stamp): Architecture takes the promotion this section priced
at "only a sidebar item" — an always-rendered `⌗ Architecture` view
row below the four collections, opening the same one-instance tab.
The Home ARCHITECTURE card, ⌘K entry, and `architecture ↗` affordances
remain; the Decisions row stays a plain panel toggle (the WO-103
board-row pattern does not mirror here — the board is a projection of
work orders, while Architecture is a system view, not a projection of
decisions). The original provisional entry — Home card + ⌘K only,
sidebar untouched, Home card only when the module registry is
non-empty — remains the shipped behavior until WO-107 lands.

## The Map tab — primary
### System map card
Modules as cards on a canvas, positioned by dependency depth (things
that depend sit above the things they depend on). Each card: name
(12.5px mono semibold), one-line purpose, `N files · M outbound`
meta, and a hollow ring marker when the module has advisory-severity
violations. Selected card gets the ember border.

Edges, by provenance:
- **Observed import** — solid grey line with arrowhead, discovered
  from the repository. The only solid lines on the map.
- **Declared rule** — dashed **gold** line (decision color), the
  intended architecture. Forbidden rules with no observed traffic
  render as faint dashed guardrails with a small gold `⨯`; an
  observed edge that is declared-allowed gains a green `✓`.
- **Violation** — an observed (solid) edge crossing a declared-
  forbidden boundary: at `advisory` severity the edge stays grey with
  a hollow ring and grey `⨯ forbidden` label; at `error` severity the
  edge, arrowhead, dot, and label render amber.
- **Conflict** — dashed amber with `⚠`.

A persistent legend row spells all of this out, naming the source of
each encoding (`observed import (repository)` / `declared rule
(decisions)`).

### Module detail panel
Selecting a module fills the panel below the map. Every section is
labeled with its provenance tag on the right of its heading:

- **Responsibilities** — `declared · registry`: the registry entry's
  `purpose`, plus its optional `responsibilities:` list when the
  project declares one (a small additive registry-schema extension
  the implementing WO files as a decision).
- **Public interface** — `discovered · exports`: exported symbols of
  the module's entry points, collected by the same line-heuristic
  tier as import scanning.
- **Governed by** — `declared · decisions`: gold chips for every
  decision whose constraints name this module (click → reader), with
  **Related requirements** derived from those decisions' links.
- **Dependencies / Dependents** — `discovered · imports`: one row per
  observed edge with import count, a provenance chip (`observed`,
  `declared`, or `declared + observed`), and a `⨯ forbidden` marker
  (grey or amber by severity) when the edge violates a rule.
- **Contents** — `discovered · file tree`: the drill-down. Breadcrumb
  `module / dir / file`; directories open to files, a file opens to
  the import specifiers it contains. This is the system → module →
  submodule → file path, and it is read-only navigation over the
  scan the snapshot already holds.

### Empty states
No registry → the view shows one card mirroring the CLI hint ("add a
`modules:` list to the workflow frontmatter, DEC-059"). A registry
module whose path is not on disk renders its card ghosted with a
`not on disk — skipped` note.

## The Rules tab — secondary
The specialized view where the N×N lattice shines: which dependencies
are allowed, forbidden, conflicting, or currently violated.

- **DEPENDENCY RULES card** — the matrix. Rows *from*, columns *to*.
  `⨯` forbidden / `✓` allowed (gold-tier declarations in neutral and
  green), `·` near-invisible unconstrained, diagonal blank. A violated
  cell badges a hollow ring + count (advisory) or a filled amber dot +
  count (error). A conflicted cell is amber `⚠` on the warn tint.
  Rule cells click through to their governing decision. Legend below.
- **ISSUES card** — only when present: conflicts and error-severity
  violations as amber warn-rows, meta `N — check exits 1`.
- **VIOLATIONS card** — always present: advisory-severity violations
  in the SRC-010 idiom (ring, edge chip, `file imports "spec"`, gold
  DEC chip). Empty state: `✓ observed imports respect every
  advisory-severity constraint`.
- **CONSTRAINTS card** — every compiled rule: edge, verdict,
  **severity badge** (`advisory` grey-bordered / `error` warn-tinted),
  governing DEC chip, trailing observed count. Conflicted edges leave
  the list with a pointer to the ISSUES card.
- **MODULES card** — the registry with the DEC-059 provenance footer
  and `workflow ↗`.

## Severity semantics (DEC-062, proposed)
Each constraint may declare `severity: advisory | error` (default
`advisory` — current WO-067 behavior, backward compatible). An
`error`-severity violation is a **check issue**: counted, amber,
exit 1 — build-blocking in CI. Because severity rides the constraint
on a governed decision, blocking power arrives only through the
user's approval stamp (REQ-008). DEC-061's unanimity rule is
severity-independent: a conflicted edge produces no violation at any
severity — the conflict issue owns it.

## Home · ARCHITECTURE card
Between HEALTH and IN FLIGHT, only when a registry exists. Meta:
`N modules · M constraints` plus a grey `· V violations` span for
advisory violations. Body: the highest-tier single line — an issue
row (conflict or error violation), else an advisory row, else
`✓ observed imports respect every active constraint`. Click → the
Map. HEALTH needs no new design: `arch-conflict` and error-severity
`arch-violation` issues plus advisory `arch-violation` rows flow
through the existing SRC-010 pipelines, each row's id chip being the
governing decision.

## Reader — decisions that carry constraints
Unchanged from the first draft, plus severity: the ARCHITECTURE
CONSTRAINTS card (frontmatter → card → body) shows each rule's edge,
verdict, **severity badge**, and observed status (`◦ n observed` /
amber dot / quiet `✓`); error-severity violations of this decision's
rules render the amber issue banner; advisory ones render SRC-010
strip lines with `architecture ↗`.

## Live behavior & state
- The **Electron main process** collects import facts (and entry-point
  exports) with the CLI's collectors — ui → cli is an allowed edge
  (DEC-060; DEC-016 precedent); hosts collect, core computes
  (DEC-040).
- Snapshot carries `architecture: ArchProjection`, the observed edge
  list with per-file detail (feeding the map, detail panel, and
  drill-down), and violations split by severity into the existing
  `issues`/`advisories` arrays once DEC-062's mechanism (WO-069)
  lands.
- Scheduling follows the incremental-snapshots bundle (SRC-031).
  Nothing is cached, dismissed, or persisted.

## Design tokens
No new tokens. Declared/gold `#CFA83D`, discovered/grey `#6E6B76` –
`#8B8893`, allowed green `#7FAF8A`, warn surfaces
`rgba(217,160,63,0.07)`/`#3A3020`, unconstrained `#2E2E36`, ember
selection — all from `design/README.md`.

## Explicitly deferred (do not build)
Editing constraints or the registry from the view (files are the
write path, DEC-002); force-directed/physics layout; an inventory
surface for allowed and unconstrained observed edges; violation
muting; submodule-level constraints (module ids stay flat per
DEC-058's survey); cross-file symbol-level analysis; promoting
Architecture to primary navigation (open, revisit after use).

## Assets
None — glyphs are unicode (⨯ ✓ · ◦ ⚠ ▸ ▾ ↗).

## Files
- `architecture-view.html` — the interactive prototype: Home, the
  Map and Rules tabs, and a decision reader on skiff fixture content,
  with the three tier-demonstration toggles described above.
