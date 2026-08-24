---
id: REQ-026
type: requirement
title: "A knowledge base with more than one committer"
status: accepted
approved: 2026-08-24
created: 2026-08-24
updated: 2026-08-24
links:
  - id: REQ-008
    rel: extends
  - id: REQ-001
    rel: constrained-by
  - id: REQ-012
    rel: extends
  - id: DEC-002
    rel: constrained-by
---

Veri's semantics are single-user by construction: sequential IDs
assume one allocator, and the approval workflow ([[REQ-008]])
names one person whose stamp binds. Both break silently the moment
a second committer branches the repo — two branches allocate the
same DEC number, or a collaborator has no legitimate way to
approve anything. This requirement makes a team-shared `veri/`
directory a designed situation instead of an accident, with git
remaining the only sync layer ([[DEC-002]]): no server, no
accounts, no real-time collaboration.

- **ID collisions are impossible to miss and mechanical to fix.**
  When two branches allocate the same ID, the merged tree fails
  `veri check` with both files named and a guided resolution;
  under no circumstances does the corpus silently hold two
  documents claiming one ID ([[REQ-001]]). If resolution requires
  renumbering, tooling rewrites the ID and every inbound link and
  `[[ref]]` in one atomic pass — no dangling references.
- **Approval extends to named maintainers.** More than one person
  may hold stamping rights. A stamp records who approved, is
  validated by core, and binds exactly like the owner's stamp —
  the gate does not distinguish maintainers it trusts.
- **PR review is the baseline approval path.** The documented
  model for teams is that promotion rides through pull-request
  review: proposed on a branch, reviewed by a maintainer, merged
  as approved — with provenance intact. Approval authority stays
  a deliberate human act per [[REQ-008]]; it is never implied by
  merge mechanics alone.
- **The solo experience is untouched.** A single-user repo
  behaves exactly as today: same allocation, same stamps, zero
  new ceremony. Team semantics activate only when a team needs
  them.
- **The workflow is documented for agents and people.** The
  website covers the team path end to end ([[REQ-012]]), and the
  scaffolded workflow doc gives agents in a team repo the same
  rules, so agent sessions on different branches do not fight
  the allocation scheme.

Out of scope for this requirement: per-document permissions or
roles beyond maintainer stamping rights, real-time or hosted
collaboration of any kind, and CI enforcement of these rules —
that is [[REQ-025]]'s ground.

## Acceptance criteria

- [ ] Two branches allocating the same new ID produce, after
      merge, a `veri check` error naming both files and the
      resolution path — never a silently corrupt corpus
- [ ] Renumber tooling (if the design calls for it) rewrites an
      ID and all inbound links/`[[refs]]` in one pass, verified
      to leave no dangling references
- [ ] A second maintainer's approval is representable in
      frontmatter, validated by core, and honored by the gate
      identically to the owner's
- [ ] The PR-review-as-approval baseline is documented end to
      end and a change following it lands approved with
      provenance intact
- [ ] An existing single-user repo passes `veri check` unmodified
      and sees no behavior change
- [ ] The website documents the team workflow from clone to first
      multi-maintainer approval
