---
id: DEC-004
type: decision
title: Native Node type stripping for dev; tsc emit for publishing
status: active
approved: 2026-08-10
created: 2026-08-06
updated: 2026-08-06
links:
  - id: WO-001
    rel: constrains
---

## Choice

Tests run directly on TypeScript sources via `node --test` using Node's
native type stripping — no loader, no test framework, no pre-compile step.
Relative imports use explicit `.ts` extensions; `tsc` emits publishable JS
via `rewriteRelativeImportExtensions`, with `erasableSyntaxOnly` enforced
so sources stay strippable (no enums, no namespaces).

## Rejected alternatives

- **tsx / ts-node loader** — works on Node 20, but adds a dev dependency
  and a second TypeScript execution semantics to keep in sync.
- **Compile-then-test** — no new dependencies, but a slower loop, and
  relative imports would have to be `.js`, making sources un-runnable
  directly.

## Rationale

Zero extra dependencies and the fastest edit-test loop. The trade-off:
development requires Node >= 22.18 (type stripping on by default), while
published output still targets Node >= 20 per CLAUDE.md — the engines
field on each package reflects the published constraint.
