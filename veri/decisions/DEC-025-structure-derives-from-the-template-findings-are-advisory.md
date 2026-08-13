---
id: DEC-025
type: decision
title: Structure derives from the template; findings are advisory
status: proposed
created: 2026-08-13
updated: 2026-08-13
links:
  - id: REQ-006
    rel: constrains
  - id: DEC-023
    rel: follows-from
  - id: DEC-006
    rel: extends
---

## Choice

The body structure [[REQ-006]] wants verified is derived from the
project's **effective template**: the `##` headings of
`getTemplate(veriDir, type)` are that type's expected sections, in
order. Core keeps no second section list — a project that customizes
its decision template to Context / Decision / Alternatives /
Consequences automatically changes what its decisions are checked
against. Core's schema module owns only what a template cannot
express: the **assembly policy** (always-included / full / excerpt
with length / name-only) that [[DEC-006]] currently hardcodes in the
MCP package.

Structural findings are **advisory**: `veri check` reports a document
missing an expected section in a separate advisories tier — file plus
one-line message, printed after the issues — that never affects the
issue count, the exit code, or the [[REQ-008]] gates. A type whose
template has no `##` headings (the source template) expects nothing.

REQ-006's criterion wording "as a normal issue" is fulfilled at
advisory severity: [[DEC-023]], approved after REQ-006, rules that
template divergence never fails a document, and enforcement enters as
warnings.

## Rejected alternatives

- **Section lists defined in core's schema, separate from templates**
  — two structure sources per type that drift apart, the exact
  three-places problem REQ-006 exists to end; and it would make
  [[REQ-010]] customization either meaningless (checks ignore it) or
  hostile (every custom-template document born flagged).
- **Structural findings as normal check issues** — contradicts
  [[DEC-023]]; would break the accepted REQ-009 criterion that
  freshly created documents pass check untouched the moment a project
  customizes a template, and would let prose style block work-order
  gates.
- **A schema DSL that generates the templates** — inverts DEC-023:
  users would edit config instead of the markdown itself.

## Rationale

One structure source per project — the template file the user already
edits — keeps REQ-010's customization and REQ-006's verification the
same feature instead of rivals. Assembly policy stays in core because
it is Veri's contract about token spend, not a per-project style
choice. Advisory severity gives authors the drift signal REQ-006
wanted without handing `veri check` a reason to block work on
formatting grounds.
