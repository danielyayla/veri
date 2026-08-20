# Handoff: Architecture in the App

## Overview
The intended architecture (REQ-022, DEC-058) and its observed side
(WO-067) made visible in the desktop app. The CLI already has both
surfaces — `veri architecture` and the advisory tier of `veri check`;
this design gives the app the same two, plus one it alone can offer:
the rule and its rationale on the same screen. The whole design obeys
the two-tier rule the advisory-surfacing bundle established:

> **Conflicts are issues — amber and filled. Violations are drift —
> grey and hollow (DEC-025).**

A project whose observed imports cross a forbidden edge must still
read as *healthy* at every glance distance: no topbar chip, green
"clean" on Home. Violations appear only where the user is already
looking at architecture or health detail, or at the governing decision
itself.

## About the Design Files
`architecture-view.html` is a **self-contained interactive prototype**
(open in a browser) on illustrative "skiff" fixture content — an
invoicing app with four modules (core, api, web, jobs) and three
constraint-carrying decisions. Two prototype controls demonstrate the
tiers: toggling **observed violations** moves only the grey tier;
toggling a **conflicting decision** summons the amber chip, tints the
lattice cell, and — per DEC-061's unanimity rule — silences the
violation on the conflicted edge until one decision is retired. It is
a design reference, not production code. All tokens reuse the canon
(`design/README.md`); shell, sidebar, and card grammar extend the
sidebar-navigation (SRC-014) and advisory-surfacing (SRC-010) bundles
unchanged.

## Fidelity
**High-fidelity for tokens, placement, tier semantics, and the lattice
matrix.** Where this spec is silent on shell behavior, the
navigation-model and sidebar bundles apply.

## Placement
The sidebar stays untouched (Home + the four collections, WO-035).
The Architecture view opens as a **tab**, reached from:

1. the **ARCHITECTURE card on Home** (below HEALTH, above IN FLIGHT) —
   the whole card is a click target;
2. a **⌘K palette entry** — "Architecture";
3. `architecture ↗` affordances on decision constraint cards and
   violation advisory lines.

The card renders only when the module registry is non-empty: a project
that declares no `modules:` never sees the feature advertised (the
same restraint as the zero-issue topbar chip).

## The Architecture view
One scrolling page, `max-width 760px`, standard card grammar. Title
"Architecture", subtitle `compiled from active decisions ·` followed
by one gold DEC chip per contributing decision (click → reader).

### MODULE LATTICE card — the centerpiece
An N×N matrix, rows **from**, columns **to**, cells 64×40, hairline
borders, mono glyphs. Cell states:

- `⨯` (`#A09DA6`) — forbidden rule; tooltip `from → to — forbidden
  (DEC-nnn)`; click opens the governing decision.
- `✓` (`#7FAF8A`) — explicitly allowed rule; same tooltip/click.
- `·` (`#2E2E36`) — unconstrained; absence means unconstrained by
  design (DEC-058), so the glyph is nearly invisible.
- diagonal — self, blank on `--bg`.
- **violated** — the rule cell additionally shows, top-right, the
  advisory idiom: 5px hollow ring + count in 9px mono `#6E6B76`. The
  glyph stays; the ring whispers over it.
- **conflicted** — cell background `rgba(217,160,63,0.07)`, border
  `#3A3020`, glyph `⚠` amber. Issue tier, exactly the warn-surface
  tokens.

A legend row (10.5px mono, `#6E6B76`) sits under the matrix. Header
meta: `N modules · M constraints`. The matrix is the *compiled
projection* — active decisions only; proposed and superseded
contribute nothing, identical to `veri architecture`.

### CONFLICTS card — only when conflicts exist
Amber warn-rows (`arch-conflict` tag) with both DEC chips inline and
the CLI's own sentence ("supersede one so the intended architecture
speaks with one voice"). Conflicts are issues, so they also appear in
the Home HEALTH card and summon the topbar chip through the existing
pipeline — this card just shows them in place.

### VIOLATIONS card — always present
Micro-label `VIOLATIONS · N` with the right-aligned note *"observed
imports vs the intended architecture — advisory, never blocking"*.
Rows are the advisory idiom: hollow ring; edge chip (`from → to`,
bordered mono like the advisory kind chip); message
`<file> imports "<specifier>"` in 11.5px mono with the file at
`#A09DA6`; trailing gold DEC chip → the governing decision's reader.
Zero violations render the quiet line `✓ observed imports respect
every active constraint` (green ✓, grey text) — never an empty card,
because "checked and clean" is information.

### CONSTRAINTS card
One row per compiled rule, the `veri architecture` printout translated
to card grammar: edge (11.5px mono), verdict (`forbidden` `#8B8893` /
`allowed` `#7FAF8A`), governing DEC chip. Rules whose edge has
observed violations gain a trailing `◦ N observed` in the advisory
scale. A conflicted edge leaves this list (a one-line grey note points
up to the CONFLICTS card).

### MODULES card
The registry: name (12px mono semibold), path (11px mono `#6E6B76`),
purpose (12.5px sans `#A09DA6`). Card footer, ghost mono: `declared on
workflow.md (WF-001) — editing the list moves it out from under its
approval stamp (DEC-059)`, with a `workflow ↗` affordance opening the
workflow document in the reader.

### Empty states
- **No registry** → the Home card is absent and the view (reachable
  via palette) shows one hv-empty card mirroring the CLI hint: *"No
  modules declared — add a `modules:` list (name, path, purpose) to
  the workflow frontmatter (DEC-059)."*
- **Registry, no constraints** → lattice renders all-unconstrained,
  constraints card shows *"(no active decision carries architecture
  constraints)"*.
- **Module path not on disk** → the MODULES row's path renders ghost
  with a `not on disk — skipped` suffix, mirroring the CLI skip note.

## Home · ARCHITECTURE card
Between HEALTH and IN FLIGHT. Meta: `N modules · M constraints`, plus
a separate `· V violations` span in `#6E6B76` when violations exist
(the advisory-count grammar from SRC-010). Body is a single line:

- conflict present → an issue row (`arch-conflict` amber kind chip);
- violations, no conflict → one advisory row (ring + grey message);
- clean → `✓ observed imports respect every active constraint`.

Click anywhere → the Architecture view. The HEALTH card needs **no
new design**: `arch-conflict` issues and `arch-violation` advisories
flow through its existing rows (SRC-010) — the advisory's `id` is the
governing DEC, so the row's id chip is gold and navigates to the
decision.

## Reader — decisions that carry constraints
Two additions to the reader, both only on decisions with an
`architecture:` block:

1. **ARCHITECTURE CONSTRAINTS card** — between the frontmatter card
   and the body (above the advisory strip). One row per rule this
   decision asserts: edge, verdict, and per-rule observed status —
   `◦ N observed` when violated, a quiet green `✓` when the scan ran
   clean. Header carries an `architecture ↗` affordance. This is the
   view's promise in miniature: the rule, its status, and the prose
   rationale on one screen.
2. **Advisory strip** (SRC-010, unchanged grammar) — `arch-violation`
   advisories anchor to the governing DEC, so its reader lists each
   violating import as a strip line. The trailing affordance is
   `architecture ↗` (not `template ↗` — the fix is an import, not a
   section).

A decision party to a conflict shows the standard amber issue banner.

## Live behavior & state
- The **Electron main process** collects import facts on snapshot
  rebuild with the same `collectImportFacts` adapter the CLI uses —
  ui → cli is an allowed edge (DEC-060; the DEC-016 precedent), and
  hosts collect facts while core computes meaning (DEC-040).
- Snapshot carries `architecture: ArchProjection` (modules, rules,
  conflicts — from `assembleArchitecture`) and merges `arch-violation`
  advisories into the existing `advisories` array. Everything above
  derives from those two; nothing is cached, dismissed, or persisted.
- Scan scheduling follows the incremental-snapshots bundle (SRC-031):
  import facts refresh on the debounced rebuild, like git facts. The
  scan reads only registry-module source trees (~hundreds of files).

## Design tokens
No new tokens. Matrix glyphs `#A09DA6`/`#7FAF8A`/`#2E2E36`, ring and
micro-labels `#6E6B76`, messages `#8B8893`, ghost `#55525E`, warn
surfaces `rgba(217,160,63,0.07)`/`#3A3020`, DEC chips gold at 10%
alpha — all from `design/README.md`.

## Explicitly deferred (do not build)
Editing constraints or the registry from the view (files are the
write path, DEC-002); a force-directed graph rendering of the lattice;
an inventory of allowed/unconstrained observed edges (out of scope per
WO-067); violation dismissal or muting; blocking severity (needs its
own DEC per WO-067); per-file drill-in beyond the violation line.

## Assets
None — glyphs are unicode (⨯ ✓ · ◦ ⚠ ↗).

## Files
- `architecture-view.html` — the interactive prototype: Home, the
  Architecture view, and a decision reader on skiff fixture content,
  with the two tier-demonstration toggles described above.
