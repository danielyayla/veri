---
id: DEC-017
type: decision
title: "Project detection is by knowledge-base shape, not by entry name"
status: proposed
created: 2026-08-11
updated: 2026-08-11
links:
  - id: WO-018
    rel: constrains
  - id: REQ-001
    rel: follows-from
---

## Choice

`isVeriProject(dir)` in `packages/ui` requires that `dir/veri` is a directory containing at least one of the four REQ-001 subdirectories (`requirements/`, `decisions/`, `work-orders/`, `sources/`). A mere entry named `veri` — a repo clone, an unrelated folder, a file — no longer qualifies. The one definition serves every UI consumer: the New-project picker guard, `pointAppAt` open validation, the `findProjectRoot` walk-up, a new boot-time gate before the MRU add (explicit launch args were previously recorded unvalidated), and an MRU prune that drops invalid rows whenever the switcher lists them. Core and the CLI are unchanged: `veri init`/`scaffoldProject` still refuse to write over any entry named `veri`, which is the correct conservative stance for a write.

## Rejected alternatives

- **Keep name-only `existsSync` detection** — the shipped behavior and the bug: any folder holding anything named `veri` reads as a project. Ruled out by observed failure, not speculation.
- **Require all four subdirectories** — rejects hand-made projects that only ever created, say, `decisions/`; REQ-001 nowhere demands all four exist on disk, only that the format supports them.
- **Validate by loading the project (parse documents, accept if loadProject succeeds)** — the strongest test, but heavyweight for a per-row MRU sweep and wrong in kind: a project whose documents currently fail to parse is still a project the user must be able to open to fix.
- **Fix only the picker and leave `findProjectRoot`/MRU alone** — leaves the same false positive reachable through launch args and stale MRU rows; one definition, all consumers, or the bug just moves.

## Rationale

"Contains something named veri" and "is a Veri project" are different predicates, and conflating them made the WO-018 guard rail misfire: ~/Projects contains a git clone named `veri`, so the picker opened the user's entire Projects folder as a 0-doc project instead of offering to create one. Every tree `veri init` produces passes the shape test (the empty scaffold creates all four subdirs), so no legitimate project is excluded, while name-collision false positives are. Detection (may I open this?) and scaffold guarding (may I write here?) deliberately stay asymmetric: opening wants the narrow test, writing wants the broad one.
