---
id: WO-067
type: work-order
title: "Observed architecture: import collection and intended-vs-observed violations"
status: in-progress
created: 2026-08-20
updated: 2026-08-20
links:
  - id: REQ-022
    rel: implements
  - id: DEC-058
    rel: constrained-by
  - id: DEC-060
    rel: constrained-by
  - id: DEC-040
    rel: constrained-by
  - id: REQ-021
    rel: derived-from
---

## Summary

Delivers REQ-022's last open criterion: deviation between the intended architecture and the code is surfaced by machinery, not left to review. The shape is [[DEC-040]]'s split, applied to imports instead of git: a host adapter collects **observed facts** — import edges between registry modules, as plain data — and pure core functions compare them against the compiled intended architecture ([[DEC-058]]), reporting every forbidden edge the code actually contains as a finding that cites its governing DEC id, the source file, and the offending import. Findings are **advisories** ([[DEC-025]] via [[REQ-021]]): intended-vs-observed deviation is drift, and drift informs, never blocks — `veri check` prints violations after issues without touching the exit code, and `veri architecture` gains a violations section when the host supplies observed facts. Collection is a v1 heuristic in the CLI: line-based extraction of static import/require/export-from specifiers from source files under each registry module's path, resolved to modules by package name (each module path's manifest) or by relative paths crossing a module-path boundary — the same pragmatic tier as the design gate's body-mention heuristic, with anything unresolvable ignored, never guessed. A module path absent from disk degrades to a skip note, mirroring how provenance degrades outside a git repository. Core stays pure: fixture-built observed edges in tests, no filesystem, no subprocess.

## In scope

- Core types for observed facts (an import edge: from-module, to-module, source file, specifier) and a pure comparison over the compiled projection producing violation advisories, each citing the governing DEC id
- A new advisory kind for architecture violations, flowing through the existing advisory pipeline (check output ordering, never the exit code)
- CLI collector: enumerate source files under each registry module's path, extract import/require/export-from specifiers line-wise, resolve them to registry modules (package-name mapping from each module path's manifest, plus relative imports that cross a module-path boundary); unresolvable specifiers are skipped
- `veri check` wiring in the CLI (host collects, core computes — the `collectGitFacts` pattern) with a skip note when module paths are not present on disk
- `veri architecture` extended to render a violations section from host-supplied observed facts; without them the printout is unchanged
- Any non-trivial extraction or resolution choice filed as a proposed DEC with rejected alternatives (WF-001 rule 4)
- Tests alongside each touched module in the existing `*.test.ts` convention; core tests build observed edges as fixtures with no filesystem access

## Out of scope

- Blocking severity: violations are advisories by [[DEC-025]]'s ruling — promoting them to issues would need its own decision first
- The MCP server and context packages: observed collection reads the codebase, and the agent door stays filesystem-lean, subprocess-free, and byte-identical to the CLI channel (DEC-037, DEC-038) — the same exclusion as git-backed advisories
- Any desktop-app UI surface (that package is design-gated, DEC-012)
- AST-grade analysis: no TypeScript compiler dependency, no tsconfig path-alias resolution, no dynamic-import tracing beyond the line heuristic — revisit on evidence the heuristic misses real edges
- Languages beyond JS/TS import syntax in v1
- Reporting allowed or unconstrained observed edges: only forbidden edges are findings; an observed-edge inventory surface is its own future work
- Caching or watching: facts are collected fresh per invocation, derive-don't-book-keep (REQ-021)

## Requirements

- [[REQ-022]] — implements
- [[DEC-058]] — constrained-by
- [[DEC-060]] — constrained-by
- [[DEC-040]] — constrained-by
- [[REQ-021]] — derived-from

## Acceptance tests

- [ ] A source file in one module importing a module its governing decision forbids surfaces an advisory naming the source file, the import specifier, and the DEC id that forbids the edge
- [ ] Allowed and unconstrained observed edges produce no findings
- [ ] Violations never change `veri check`'s exit code: a corpus with zero issues and one violation still exits 0, the violation printed in the advisory tier
- [ ] Core's comparison is pure and fixture-tested: observed edges constructed as literals, no filesystem or subprocess in core tests
- [ ] The CLI collector maps files to modules by registry path prefix and resolves both package-name specifiers and relative imports crossing module boundaries; external and unresolvable specifiers produce nothing
- [ ] A registry module whose path does not exist on disk yields a skip note, never a failure
- [ ] `veri architecture` renders a violations section when observed facts are supplied and byte-identical unchanged output when they are not
- [ ] Dogfood: Veri's own repository reports zero violations against DEC-060's seven forbidden edges
- [ ] `veri check` reports zero issues across the corpus and all tests pass

## Receipts

(none yet)
