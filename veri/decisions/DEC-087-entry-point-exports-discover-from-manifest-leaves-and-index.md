---
id: DEC-087
type: decision
title: "Entry-point exports discover from manifest leaves and index conventions, unioned, with relative re-export chains followed"
status: active
approved: 2026-08-25
created: 2026-08-25
updated: 2026-08-25
links:
  - id: WO-068
    rel: constrains
  - id: DEC-061
    rel: follows-from
  - id: DEC-040
    rel: follows-from
---

## Choice

The module detail panel's "Public interface — discovered · exports" section
([[SRC-036]]) needs a definition of *entry point* and a way to read exported
names, at the same heuristic tier as import scanning ([[WO-067]]). Both are
fixed in the CLI's collector module (`collectExportFacts`), beside the
import collector the sidecar already reuses (the allowed ui → cli edge,
[[DEC-060]]).

**Entry points are a union, not a priority list.** For each registry module:
every file that exists among the manifest's `main` and `module` fields and
the string leaves of its `exports` map (traversed through arbitrary
condition nesting), plus the `index.<ext>` and `src/index.<ext>` conventions
at the module root. All that exist are scanned and their names unioned — a
TS monorepo package contributes `src/index.ts`, its built `dist/index.js`
adds nothing new, and neither ordering nor manifest style changes the
result. A module with no discoverable entry point yields an empty list — a
fact the panel states, never a failure.

**Names come from the regex tier; relative `export * from` chains are
followed.** Per-form regexes read `export function|class|const|let|var|
interface|type|enum`, brace groups (including `as` renames and multi-line
groups), `export default`, and `export * as ns`. A relative `export * from`
resolves like the runtime would (exact, +extension, /index) but only inside
the module's own path, cycle-guarded — without this, every veri package
(whose index is a re-export barrel) would report an empty interface. Names
are deduplicated and sorted; output is keyed by module in registry order,
deterministic (REQ-018's posture).

## Rejected alternatives

- **A TypeScript-compiler or parser-based extraction** — the accurate tool,
  but WO-067 fixed the tier deliberately: the line heuristic is dependency-
  free, fast enough to run per snapshot rebuild, and this surface is a
  description, not a gate. Revisit if the panel's accuracy ever gates work.
- **Manifest entries only** — truthful for published packages, empty for
  the common dev shape where `main` points at an unbuilt `dist/`; the union
  keeps both worlds honest without a staleness heuristic.
- **First-match priority (src/index over manifest)** — forces an ordering
  argument with no observable payoff; the union makes ordering moot.
- **Following bare-specifier re-exports across modules** — a module's
  public interface ends at its boundary; re-exporting another module's
  symbols is an edge the import scan already reports.

## Rationale

The panel's provenance tag says `discovered` — so discovery must be honest
about its tier: cheap, deterministic, and silent where it cannot resolve.
Union-of-candidates buys robustness across project archetypes for one
`Set`, and following relative barrels is the minimum needed for the
discovered interface of this very repository to be non-empty — the dogfood
standard every architecture surface has met so far ([[WO-066]], [[WO-067]]).
