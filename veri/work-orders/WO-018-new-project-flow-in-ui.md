---
id: WO-018
type: work-order
title: New-project flow in the UI
status: in-progress
created: 2026-08-11
updated: 2026-08-11
links:
  - id: SRC-007
    rel: designed-by
  - id: REQ-004
    rel: extends
  - id: REQ-002
    rel: depends-on
  - id: DEC-002
    rel: constrained-by
  - id: DEC-007
    rel: constrained-by
  - id: DEC-009
    rel: constrained-by
  - id: DEC-010
    rel: constrained-by
  - id: DEC-012
    rel: constrained-by
---

## Goal

The desktop app can only open an existing Veri project; a first-time
user without a `veri/` directory hits a dead end and must drop to the
terminal for `veri init`. Add a "New project…" flow to the UI: pick a
directory, scaffold `veri/` (optionally seeded with the demo project
per [[DEC-007]]), add it to the MRU list ([[DEC-010]]), and open it.

## In scope

- Extract the scaffold logic from `packages/cli` (`init()` in
  `commands.ts`) into a `packages/core` function; the CLI and the UI
  both call it (same reuse pattern as [[DEC-009]]). CLI behavior is
  unchanged.
- "New project…" entry points in the topbar project switcher and the
  command palette.
- A minimal creation flow: native directory picker → optional
  "seed with demo project" toggle → scaffold → MRU add → project opens
  (Home view as usual).
- Guard rails: a chosen directory that already contains `veri/` is
  opened, not re-scaffolded; a non-empty directory is fine (Veri lives
  alongside code); scaffold errors (permissions, etc.) surface in the
  UI without corrupting MRU state.
- Design document first, per [[DEC-012]]: this work order must gain a
  `rel: designed-by` link to a committed design bundle before
  implementation starts.

## Out of scope

- Any change to CLI flags or the MCP server.
- Project templates beyond the existing empty/demo pair.
- Git initialization or any VCS integration in the new directory.
- Onboarding/tour UI beyond the creation flow itself.

## Acceptance tests

- [x] "New project…" is reachable from the project switcher and the
      command palette.
- [x] Creating an empty project produces the same tree as `veri init`;
      with the demo toggle, the same tree as `veri init --demo`
      (byte-identical scaffold via the shared core function).
- [x] The new project is prepended to the MRU list and opens
      immediately with the Home view.
- [x] Picking a directory that already has `veri/` opens it and
      scaffolds nothing.
- [x] A scaffold failure shows an error in the UI and leaves the MRU
      list unchanged.
- [x] `veri check` and `npm test` are clean; CLI `init` tests still
      pass against the extracted core function.
