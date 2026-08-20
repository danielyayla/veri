---
id: DEC-061
type: decision
title: "Observed-import collection scans everything but vendored trees; conflicted edges never fire as violations"
status: active
approved: 2026-08-20
created: 2026-08-20
updated: 2026-08-20
links:
  - id: WO-067
    rel: constrains
  - id: DEC-058
    rel: follows-from
  - id: DEC-025
    rel: follows-from
---

## Choice

Three choices WO-067 left to the implementer, fixed together because they define the collector's precision posture.

**Enumeration scope.** The CLI collector walks every file with a JS/TS extension (.ts/.tsx/.mts/.cts/.js/.jsx/.mjs/.cjs) under each registry module's path, skipping only `node_modules` and dot-directories, without following symlinks. No src/dist/build convention is assumed: generated output carries the module's real edges (it is compiled from them), while vendored and hidden trees are categorically not the module's own code. The walk is depth-first in byte order, so collected edges are deterministic.

**Conflicted edges defer to the conflict issue.** An observed edge that active decisions both allow and forbid produces no violation advisory: that contradiction is already an `arch-conflict` check *issue* ([[WO-066]]) naming both decisions, and a violation citing one side would assert an intent the corpus has not settled. The violation tier speaks only where the intended architecture speaks with one voice.

**Anchoring and deduplication.** A violation advisory's document anchor (`id`) is the *oldest* forbidding decision — the original ruling — with every forbidding DEC listed in `forbiddenBy`; identical (from, to, file, specifier) edges collapse to one, so the import/require/export-from forms of the same dependency report once.

## Rejected alternatives

- **Skipping conventional build-output directories (dist, build, release, out)** — hardcodes JS-ecosystem build conventions into a collector the registry says nothing about, and creates silent blind spots the day a project names its output differently; scanning them costs little since forbidden edges in generated code trace back to real source edges.
- **Skipping test files** — a test importing a forbidden package is real coupling (a devDependency edge is still an edge); the design-gate precedent is heuristic breadth, not carve-outs.
- **Also reporting violations on conflicted edges** — double-reports one corpus problem through two tiers at once; the blocking conflict issue already names both decisions and demands a supersession.
- **Anchoring violations on the newest forbidding decision** — the newest anchor is right for *conflicts* (the later act is the one to retire) but wrong here: for an agreeing majority the oldest decision is the original authority the violation defies.

## Rationale

WO-067 fixes the mechanism (line heuristic, manifest-name plus relative-crossing resolution, advisory severity) but leaves the collector's edges-of-the-edges open. The common thread in these three choices is that the observed tier must never overclaim: scan everything that is plausibly the module's code rather than guessing at conventions, stay silent where the intended architecture contradicts itself, and cite the decision that actually established the rule.
