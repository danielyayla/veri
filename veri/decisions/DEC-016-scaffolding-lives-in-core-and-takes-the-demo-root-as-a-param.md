---
id: DEC-016
type: decision
title: "Scaffolding lives in core and takes the demo root as a parameter"
status: active
approved: 2026-08-11
created: 2026-08-11
updated: 2026-08-11
links:
  - id: WO-018
    rel: constrains
  - id: DEC-007
    rel: follows-from
---

## Choice

`scaffoldProject(root, { demo, demoRoot })` lives in `packages/core` (`scaffold.ts`) and is the single implementation behind both `veri init` and the desktop app's New-project flow. Because the skiff demo ships inside `packages/cli` per DEC-007, core never resolves the demo itself: every caller passes a `demoRoot`. The CLI passes its own exported `DEMO_ROOT`; `packages/ui` gains a dependency on `@veri/cli` solely to import that same constant, so both surfaces copy from one set of files. The function throws `ProjectExistsError` when the target already holds a `veri/` directory, and validates `demoRoot` before writing anything, so a rejected call leaves the filesystem untouched.

## Rejected alternatives

- **Move `packages/cli/demo/` into `packages/core`** — would let core resolve the demo with no parameter, but directly contradicts [[DEC-007]], which put the demo in the CLI package deliberately (it ships in that npm package's `files`, and the MCP package's demo test reads it as a fixture). Reversing that is a bigger decision than WO-018's scope allows.
- **Duplicate the demo files under `packages/ui`** — removes the `@veri/cli` dependency, but two copies of sixteen documents drift the moment either is edited, and the "byte-identical scaffold" criterion would then be a promise rather than a guarantee.
- **Have the UI import `init()` from `@veri/cli` directly** — the smallest diff, but WO-018 explicitly scopes the extraction into core, and `init()` returns CLI-shaped `{ code, lines }` output that the UI would have to parse back into structured data to render a sheet.
- **Have core locate the demo via `import.meta.resolve('@veri/cli')`** — keeps the call sites parameterless, but gives core a runtime dependency on a sibling package and inverts the dependency graph (core → cli), which no other part of the system does.

## Rationale

Byte-identical scaffolds between the CLI and the UI is a WO-018 acceptance criterion, and identity only holds by construction if there is exactly one implementation and one copy of the demo files. Passing `demoRoot` in keeps core honest about its boundaries — it does the writing, the packages that own content say where content lives — and preserves core's zero-runtime-dependency constraint (only `node:fs` and `node:path`). The dependency direction stays acyclic: ui → cli → core.
