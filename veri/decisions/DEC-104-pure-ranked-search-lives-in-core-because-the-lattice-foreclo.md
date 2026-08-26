---
id: DEC-104
type: decision
title: "Pure ranked search lives in core because the lattice forecloses DEC-009's third-consumer trigger in mcp"
status: active
approved: 2026-08-26
created: 2026-08-25
updated: 2026-08-26
links:
  - id: WO-106
    rel: constrains
  - id: DEC-009
    rel: follows-from
  - id: DEC-044
    rel: follows-from
  - id: DEC-060
    rel: follows-from
---

## Choice

The palette query grammar and ranked matching (parsePaletteQuery, relatedIds, rankDocs, the Palette* shapes, and their score tables) move from packages/mcp into a pure core module. The mcp package keeps what is genuinely the door's: searchDocs (WO-003 substring semantics, mcp-local) and paletteSearch (the existsSync + loadProject IO wrapper the sidecar and the search tool call), and re-exports the moved names so @verikb/mcp's public surface is unchanged and no consumer outside mcp/search.ts edits an import. DEC-009 and DEC-044 stay active and unmodified: assembleContext remains in mcp (DEC-009's home argument for the assembly rules holds; its rejected move-to-core alternative stays rejected), and the one-grammar-everywhere contract of DEC-044 is strengthened — the one implementation now sits below every surface instead of inside one of them. No ./search subpath is claimed (DEC-100 precedent: no speculative subpaths without a browser consumer).

## Rejected alternatives

- **Leave the ranking in mcp per DEC-009's "natural home until a third consumer appears"** — rejected: the trigger is unreachable from inside mcp. DEC-060 forbids cli → mcp, and the renderer cannot bundle mcp's node-flavored entry at all, so the two plausible third consumers (a `veri search` command, renderer-local synchronous ranking) are structurally prevented from ever appearing while the code sits there. A rule whose escape clause cannot fire is a wall, not a home.
- **Bless a cli → mcp edge instead, when a CLI consumer arrives** — rejected: DEC-060's whole shape is that surfaces compose core, never each other; ui → mcp is blessed because the app is the top of the stack hosting the door in-process. A cli → mcp edge for one pure function inverts the lattice for no gain over moving the function down.
- **Move paletteSearch and searchDocs to core too** — rejected: paletteSearch is host IO (filesystem existence, project loading) and searchDocs is a deliberately preserved mcp-local semantics (WO-003); core stays free of surface concerns and mcp keeps a real module boundary rather than becoming a pure re-export shell.
- **Duplicate the ranking into core and deprecate mcp's copy gradually** — rejected: a transition period with two live implementations is the drift vector this whole series (DEC-091, DEC-092, DEC-098, DEC-100) exists to eliminate; re-exports give the same compatibility with zero duplication.

## Rationale

The module registry's own charters decide this: core is "pure domain logic over veri/", mcp is "the agent door" — and rankDocs after WO-090 (multi-term AND scoring, tiers, neighborhood filtering) is substantial domain logic wearing a door's address. The relocation costs nothing (re-exports keep every import site byte-stable, the test suite moves verbatim) and buys the lattice back its honesty: any future surface — CLI, renderer, Action — can reach the one ranking implementation through core, the only dependency every surface already has. Sixth decision in the deepening series and the first that is purely about locality: no bug, no drift yet, just code in the wrong room while the doors it blocks stay locked.
