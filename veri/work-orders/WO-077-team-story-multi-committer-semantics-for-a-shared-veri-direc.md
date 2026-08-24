---
id: WO-077
type: work-order
title: "Team story: multi-committer semantics for a shared veri/ directory"
status: done
created: 2026-08-24
updated: 2026-08-24
links:
  - id: REQ-026
    rel: implements
  - id: REQ-008
    rel: extends
  - id: REQ-001
    rel: constrained-by
  - id: DEC-002
    rel: constrained-by
  - id: REQ-012
    rel: extends
---

## Summary

Define and implement how a veri/ knowledge base behaves with more than one committer, keeping git as the only sync layer. Three problems are currently implicit: sequential IDs collide the moment two branches both allocate the next DEC number; the approval model is explicitly single-user ("belongs to the user alone") with no stated semantics for a second maintainer; and there is no guidance for how veri/ changes should flow through a PR-based workflow. This work order makes those semantics designed rather than accidental: a defined ID-collision story (detection at minimum, a collision-resistant allocation scheme if the design calls for one), approval rights that extend to named maintainers — with "approvals ride through PR review" as the baseline model — and a documented PR workflow for knowledge-base changes. No real-time collaboration and no server: files and git remain the whole substrate.

## In scope

- A design pass settling the ID-collision approach (e.g. detect-and-refuse on merge with a guided renumber, reservation via branch-aware allocation, or another scheme) filed as proposed DECs
- `veri check` detecting duplicate IDs across the tree with a clear, actionable error (today's behavior audited and specified)
- Defined approval semantics for multiple maintainers: who may stamp, how a stamp records the approver, and what the PR-review-as-approval baseline means mechanically
- Tooling support the design demands (e.g. a renumber/remap command that rewrites an ID and every link to it in one atomic pass)
- A website page documenting the team workflow: branching, PR review of veri/ changes, resolving ID collisions, multi-maintainer approvals
- Updates to the scaffolded workflow doc so agents in a team repo follow the same rules

## Out of scope

- Real-time or server-mediated collaboration, accounts, or any hosted component (DEC-002 — git is the sync layer)
- Per-document permissions or role systems beyond maintainer approval rights
- Changing the single-user experience: a solo repo must behave exactly as today
- CI enforcement of these rules (the GitHub Action work order, WO-076, is the enforcement surface)

## Requirements

- [[REQ-008]] — extends
- [[REQ-001]] — constrained-by
- [[DEC-002]] — constrained-by
- [[REQ-012]] — extends

## Acceptance tests

- [x] Two branches that each allocate the same new ID produce, after merge, a `veri check` error naming both files and the resolution path — never silent corruption (verified live in a scratch git repo: two branches each allocated DEC-001, git merged *cleanly*, `veri check` exited 1 naming both files and the `veri renumber` command)
- [x] The chosen allocation/renumber design is recorded in approved DECs ([[DEC-070]], [[DEC-071]], [[DEC-072]], all active 2026-08-24), and `veri renumber` rewrites the ID, filename, and all inbound links/[[refs]] in one computed-then-written pass — contested references are never rewritten by guessing, so nothing dangles either way (renumber.test.ts: post-renumber projects are check-clean in every scenario)
- [x] Approval by a second maintainer is representable in frontmatter (`approved_by:` validated against the workflow's `maintainers:` list), validated by core (unknown-approver issue, missing-approver advisory), and honored by the gate exactly like the owner's stamp — the gate tests stamp presence, not identity
- [x] The PR-review-as-approval baseline is documented end to end (site/docs/team.html) and verified live: REQ-001 proposed on a branch by Owner, stamped on the branch by maintainer Ada via `veri approve` (--as defaulted from git identity), merged to main as accepted with approved_by: Ada and the stamp commit authored by Ada
- [x] A solo project sees zero behavior change: this repo (227 documents, no maintainers list) passes `veri check` unmodified with the identical report, and the full 552-test suite is green
- [x] The website documents the team workflow from clone to first multi-maintainer approval (site/docs/team.html, linked from every docs strip, the reference, and the README)

## Receipts

- 2026-08-24 — 51840df — veri/decisions/DEC-070-id-allocation-stays-sequential-collisions-resolve-by-one-ato.md, veri/decisions/DEC-071-maintainers-ride-the-workflow-frontmatter-stamps-gain-approv.md, veri/decisions/DEC-072-the-approval-stamp-commit-rides-the-pull-request-merge-never.md, veri/ids — Design pass: audited today's duplicate-id detection, veri/ids merge behavior, and the stamp format; filed the three proposed DECs settling the id-collision scheme (sequential allocation + atomic veri renumber), multi-maintainer stamps (maintainers list in workflow frontmatter + approved_by), and the PR-review-as-approval baseline (stamp commit rides the PR; merge never approves). No code yet — implementation awaits DEC approval.
- 2026-08-24 — 10fb4d8 — packages/core/src/renumber.ts, packages/core/src/schema.ts, packages/core/src/check.ts, packages/core/src/approve.ts, packages/core/src/workflow-default.ts, packages/cli/src/commands.ts, packages/cli/src/cli.ts, packages/cli/src/git.ts, action/dist/index.js, site/docs/team.html — Implemented per the approved DECs: atomic renumberDocument with the guided duplicate-id error and --refs policy for contested references; maintainers/approved_by schema, unknown-approver issue and missing-approver advisory, veri approve --as with git-identity default; scaffolded workflow gains Working-as-a-team rules; team.html plus strips/reference/README; action bundle rebuilt. 552 tests green; both collision resolution and the PR-approval walk verified live in a scratch two-branch git repo.
