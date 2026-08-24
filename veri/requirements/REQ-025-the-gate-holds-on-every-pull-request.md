---
id: REQ-025
type: requirement
title: "The gate holds on every pull request"
status: accepted
approved: 2026-08-24
created: 2026-08-24
updated: 2026-08-24
links:
  - id: REQ-021
    rel: extends
  - id: REQ-002
    rel: depends-on
  - id: REQ-012
    rel: extends
  - id: DEC-002
    rel: constrained-by
---

Veri's guarantees — the approval gate, drift surfacing, receipt
provenance — currently hold only on machines where someone runs
`veri check`. The moment a `veri/` directory is shared, that is not
enough: a merged PR that violates the gate corrupts the corpus for
everyone, and no discipline on one contributor's machine protects
the branch. This requirement moves enforcement to where the team
actually converges: continuous integration on pull requests.

- **CI runs the same checker, not a reimplementation.** The CI
  surface wraps the published CLI ([[REQ-002]]) so a local
  `veri check` and the PR check can never disagree. There is no
  second source of truth about what is valid.
- **Violations block, advisories inform.** Gate violations — the
  errors `veri check` refuses on — fail the pull request. Advisories
  (stamp drift, receipt provenance, [[REQ-021]]) surface as
  annotations on the documents they concern without blocking by
  default; a project may opt to escalate them to failures.
- **Provenance checks work under CI conditions.** Receipt-vs-git
  verification functions in a CI checkout, and where it needs
  history depth the requirement is documented and the check fails
  informatively — never falsely — when history is missing.
- **Setup is one snippet.** A team adopts the CI surface by pasting
  a documented workflow snippet ([[REQ-012]]); no hosted service,
  no credentials, nothing leaves the user's CI ([[DEC-002]]).
- **Veri eats its own gate.** This repository runs the published
  surface on its own pull requests; the self-hosting loop is the
  standing proof that the check is honest.

Out of scope for this requirement: CI providers beyond GitHub
Actions (the CLI remains the portable path), auto-fixing from CI,
and approval semantics in review — who may stamp is [[REQ-026]]'s
ground, not CI's.

## Acceptance criteria

- [ ] A pull request introducing a gate violation fails its check
      with the violating document and rule named in the output
- [ ] A pull request introducing only advisories passes by default
      and shows annotations on the affected documents; a documented
      option escalates advisories to failures
- [ ] Receipt/commit verification either works on the provider's
      default checkout or the docs state the exact history
      requirement, and missing history produces an informative
      failure rather than a false verdict
- [ ] The CI surface adds no checking logic of its own — its
      verdict on any tree is identical to the local CLI's
- [ ] This repository enforces the published surface on its own
      pull requests
- [ ] The website documents adoption from snippet to first green
      check on one page
