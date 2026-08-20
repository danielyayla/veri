---
id: WO-066
type: work-order
title: "Architecture constraints: schema validation, module registry, and the compiled projection"
status: done
created: 2026-08-20
updated: 2026-08-20
links:
  - id: REQ-022
    rel: implements
  - id: DEC-058
    rel: constrained-by
  - id: REQ-021
    rel: derived-from
---

## Summary

Makes DEC-058's convention real, delivering its two hard requirements in one unit so the rules are never write-only. Core gains a schema for the `architecture:` frontmatter block on decisions ([[DEC-058]]): `constraints: [{from, to, allowed}]` where `from`/`to` accept a single module name or a list. `veri check` fails on a malformed block and on any constraint naming a module the registry does not define — a rule that silently never fires is worse than none. A module registry (name → path → one-line purpose) is established; DEC-058 left its home open (dedicated registry document vs. derivation from `package.json` workspaces with annotated purposes), so the implementer resolves it and files the choice as a proposed decision per WF-001 rule 4 before building on it. `veri architecture` prints the compiled intended architecture: the registry's modules with purposes, then every constraint collected from **active** decisions only, each line citing its governing DEC id; proposed and superseded decisions contribute nothing. Assembly is deterministic — the same files produce byte-identical output. Two active decisions asserting opposite `allowed` for the same from→to edge is reported as a conflict by both `veri check` and the printout.

## In scope

- Zod schema for the `architecture` key on decision frontmatter in `packages/core` (unknown other keys stay passthrough per REQ-001); malformed blocks become `veri check` issues
- Module-name resolution against the registry; unknown names in any constraint are check issues
- The registry-home choice, filed as a proposed DEC with rejected alternatives
- Pure-core assembly of the compiled projection (active decisions only, DEC-id annotations, deterministic ordering) with conflict detection on contradictory edges
- `veri architecture` CLI command rendering the projection
- Tests alongside each touched module, matching core's existing `*.test.ts` convention

## Out of scope

- Observed architecture: import scanning, dependency extraction, or intended-vs-observed drift — a later WO once the intended side exists
- Any desktop-app UI surface (that package is design-gated, DEC-012) and any new MCP tool
- Hierarchical or glob module ids (`plugins/*`, `billing/schema`) — DEC-058's survey found flat names sufficient to start; revisit on demand
- Authoring actual constraints for Veri's own packages — that is policy, filed as its own decision once this mechanism ships, so mechanism and policy stay separately supersedable
- Constraint kinds beyond `{from, to, allowed}` (no layering, visibility, or export rules)

## Requirements

- [[DEC-058]] — implements
- [[REQ-021]] — derived-from

## Acceptance tests

- [x] A decision with a well-formed `architecture.constraints` block referencing known modules passes `veri check` with zero issues
- [x] A malformed block (wrong shape, missing `allowed`, non-list `to` that isn't a string) is a check issue naming the offending document
- [x] A constraint naming a module absent from the registry is a check issue (the typo case)
- [x] `veri architecture` lists registry modules with purposes and every constraint from active decisions, each citing its DEC id
- [x] A `proposed` decision's constraints appear nowhere in the projection; superseding a decision removes its constraints from the projection with no other edit
- [x] Two active decisions asserting opposite `allowed` for the same from→to edge are reported as a conflict by both `veri check` and `veri architecture`
- [x] Projection output is byte-identical across repeated runs on the same files
- [x] The registry-home decision is filed as a proposed DEC with rejected alternatives
- [x] `veri check` reports zero issues across the corpus and all core tests pass

## Receipts

- 2026-08-20 — 12c6e7f — packages/core/src/schema.ts, packages/core/src/types.ts, packages/core/src/architecture.ts, packages/core/src/architecture.test.ts, packages/core/src/check.ts, packages/core/src/index.ts, packages/cli/src/cli.ts, packages/cli/src/commands.ts, packages/cli/src/commands.test.ts, veri/decisions/DEC-059-module-registry-rides-the-workflow-document-s-frontmatter.md — DEC-058's convention shipped whole: architecture.constraints schema on decision frontmatter (malformed = invalid-frontmatter issue), module registry as modules: on workflow frontmatter (DEC-059 filed, proposed), unknown-module and conflicting-edge check issues, pure-core deterministic projection with DEC-id citations, and the veri architecture CLI printout; 496 tests pass (13 new in core, 1 new CLI), typecheck clean, veri check 0 issues · 1 pre-existing WO-034 advisory; Veri's own registry/constraints deliberately not authored — that is the policy DEC this WO leaves out of scope
