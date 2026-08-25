---
id: WO-069
type: work-order
title: "Constraint severity: schema, check semantics, and the CLI surfaces"
status: in-progress
created: 2026-08-20
updated: 2026-08-25
links:
  - id: REQ-022
    rel: implements
  - id: DEC-062
    rel: constrained-by
  - id: DEC-058
    rel: constrained-by
  - id: DEC-061
    rel: constrained-by
  - id: REQ-021
    rel: derived-from
---

## Summary

The mechanism half of [[DEC-062]], kept separate from the app surfaces ([[WO-068]]) so severity works identically for terminal-only users and CI before any pixel ships. Core's constraint schema gains the optional `severity: advisory | error` field (default advisory, [[REQ-001]] passthrough preserved); `ArchRule` carries it through the compiled projection. `checkObservedArchitecture` splits by declared severity: violations of error-severity rules become check **issues** — counted, exit 1, flowing through the issue pipeline — while advisory-severity violations keep WO-067's grey tier untouched. [[DEC-061]]'s unanimity rule stays severity-independent: a conflicted edge produces no violation at any severity. `veri check` wires the split (error violations fail the run; advisories print after issues as today), and `veri architecture` prints each rule's severity and renders error violations in the issues position. The dogfood corpus is the backward-compatibility proof: [[DEC-060]] carries no severity fields, so this repo's behavior is byte-identical before and after.

## In scope

- Zod schema: optional `severity` enum on `architecture.constraints` entries; malformed values are invalid-frontmatter issues like any other field
- `ArchRule.severity` in the compiled projection; deterministic output unchanged for rules without the field
- Core comparison split: error-severity violations as a new `arch-violation` issue kind, advisory-severity violations as the existing advisory — one function, one severity switch, DEC-061 unanimity applied before the split
- CLI `veri check`: error violations counted in issues and the exit code; advisory tier unchanged
- CLI `veri architecture`: severity column in the constraints listing; error violations rendered with the issues, advisory ones in the violations section
- Tests alongside each touched module: severity parsing, tier routing, conflicted-edge suppression at both severities, and the dogfood test proving this repository's output is unchanged

## Out of scope

- Any UI surface — [[WO-068]] renders severity once this mechanism exists
- Adding severity to [[DEC-060]]'s constraints — editing an approved decision is Daniel's act, made by editing and re-approving that document
- A third severity level, global enforcement configuration, or derived/inferred severity (rejected in DEC-062)
- MCP and context packages (DEC-037, DEC-038 — the standing exclusion)
- Changing DEC-061's unanimity rule or conflict anchoring

## Requirements

- [[REQ-022]] — implements
- [[DEC-062]] — constrained-by
- [[DEC-058]] — constrained-by
- [[DEC-061]] — constrained-by
- [[REQ-021]] — derived-from

## Acceptance tests

- [ ] A constraint with `severity: error` whose edge is observed produces a check issue naming file, specifier, and governing DEC — and `veri check` exits 1
- [ ] The same violation at `severity: advisory` (or with no severity field) remains an advisory with exit 0 — WO-067 behavior byte-identical
- [ ] An invalid severity value is an invalid-frontmatter issue naming the document
- [ ] A conflicted edge produces no violation at either severity; the conflict issue stands alone
- [ ] `veri architecture` prints each rule's severity and places error violations with issues, advisory violations in the violations section, deterministically
- [ ] Dogfood: this repository's `veri check` and `veri architecture` output are unchanged by the upgrade (DEC-060 declares no severities)
- [ ] `veri check` reports zero issues across the corpus and all tests pass

## Receipts

(none yet)
