---
id: REQ-019
type: requirement
title: Promises match the product; self-hosting never leaks
status: accepted
approved: 2026-08-18
created: 2026-08-18
updated: 2026-08-18
links:
  - id: SRC-016
    rel: informed-by
  - id: DEC-018
    rel: follows-from
---

Veri's credibility rests on telling the truth about itself — the same
product that shows the exact write before it happens must not document
commands that don't exist or describe package contents that were removed.
[[SRC-016]] found four instances of promise/reality drift and one
self-hosting artifact leaking into every user's project:

- `veri context <WO-id>` is instructed in every scaffolded AGENTS.md (and
  cited in [[DEC-018]]) but is not implemented.
- README and the `get_context` tool description still say packages include
  "project conventions (CLAUDE.md)" — removed by [[DEC-018]].
- The package panel's PACKAGE RULES footer repeats the same stale claim.
- The UI package still describes itself as "five screens."
- `checkDesignGate` hardcodes the literal string `packages/ui` in shared
  core, so every non-Veri project inherits a check keyed to this repo's
  directory layout ([[DEC-012]] deserves better plumbing).

## Acceptance criteria

- [ ] `veri context` exists, or no scaffolded or shipped text mentions it.
- [ ] Every description of package contents (README, tool description,
      PACKAGE RULES footer) matches what `assembleContext` actually emits.
- [ ] Core contains no path, name, or heuristic specific to the Veri repo;
      the design-gate trigger is project-defined (via workflow, template,
      or config-as-document), and `veri check` behaves identically in any
      project.
- [ ] A drift like these is caught before it ships: scaffolded text and
      tool descriptions are exercised by a test that fails when they name
      a command or content the build does not provide.
