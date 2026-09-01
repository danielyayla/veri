---
id: REQ-022
type: requirement
title: "Intended architecture is governed and mechanically checked"
status: retired
approved: 2026-08-20
created: 2026-08-20
updated: 2026-09-01
links:
  - id: REQ-021
    rel: extends
  - id: DEC-144
    rel: retired-by
---

In an agent-heavy codebase, structure erodes through individually
reasonable imports: each one compiles, works, and passes file-level
review, because the reviewer sees the file, not the edge. A controller
reaching past its service layer, two adapters coupling sideways, a
serving path importing training code — none of these is visible in the
diff that introduces it. The boundaries a project depends on must
therefore be explicit, governed, and checked by machinery, not by
memory ([[REQ-021]] extended from documents to dependency structure).

The intended architecture is a first-class part of the knowledge base:
rules about which modules may depend on which, carried by approved
documents, inseparable from the rationale that justifies them. What
distinguishes this from a dependency linter is provenance — a violation
answers "who decided this, when, and why," in the same breath as "what
broke."

## Acceptance criteria

- [ ] Architecture rules exist only in governed documents; they bind
      when approved and retire when superseded. The intended
      architecture cannot change without the user's stamp ([[REQ-008]]).
- [ ] Every rule is traceable to its governing document: any surface
      that reports a rule or a violation cites the document and can
      reach its rationale.
- [ ] A rule that cannot fire — malformed, or naming a module the
      project does not define — is a `veri check` failure, never a
      silent no-op.
- [ ] The intended architecture is a deterministic projection over the
      knowledge base: the same files produce the same output, and human
      and agent see the identical result ([[REQ-018]]'s contract
      properties).
- [ ] Contradictory rules (two active documents disagreeing about the
      same boundary) are mechanically detected and reported.
- [ ] Deviation between intended and observed structure is surfaced by
      machinery, not left to review ([[REQ-021]]): when the observed
      side exists, a forbidden dependency in the code is a reported
      violation citing its governing document.

## Notes

[[DEC-058]] decides the initial mechanism: constraints ride decision
frontmatter; the projection compiles from active decisions over a
module registry. This requirement is satisfiable by other mechanisms
should that decision ever be superseded. The observed-structure
criterion is expected to land in a later work order than the intended
side ([[WO-066]] delivers the intended half).

**Retired 2026-09-01** by [[DEC-144]]: the architecture layer leaves
the product — enforcement belongs to act-time lint and hooks, the
choice of a boundary to an ordinary decision's prose. In its life on
this repository the layer caught no real erosion ([[SRC-066]]);
[[WO-150]] carries the removal. DEC-144's revisit condition names
what would reopen this: an erosion incident shipping through both
review and lint that a governed rule would demonstrably have caught.
