---
id: WO-076
type: work-order
title: "CI surface: a published GitHub Action that runs veri check on pull requests"
status: in-progress
created: 2026-08-24
updated: 2026-08-24
links:
  - id: REQ-025
    rel: implements
  - id: REQ-021
    rel: extends
  - id: REQ-002
    rel: depends-on
  - id: REQ-012
    rel: extends
  - id: DEC-002
    rel: constrained-by
---

## Summary

Make Veri's guarantees mechanical for a whole team, not one machine: a published, versioned GitHub Action that runs `veri check` against the repository's `veri/` directory on every pull request. Gate violations fail the check; drift and receipt-provenance advisories surface as PR annotations on the lines/files they concern; receipts citing commits are verified against the actual git history available in CI. The action wraps the existing CLI — no new checking logic — so local and CI verdicts can never disagree. This is the companion to the multi-committer work: once `veri/` changes arrive by PR, the PR is where the gate has to live.

## In scope

- A reusable GitHub Action (composite or Node-based) in this repo, published to the Actions marketplace, that installs the pinned `@veri/cli` and runs `veri check` on the PR's checkout
- Exit-code policy: gate violations (errors) fail the run; advisories (drift, receipt provenance) annotate but pass by default, with an input to escalate them to failures
- PR annotations that name the document and the finding, using the checker's existing output mapped to file paths
- Receipt/commit verification working under CI checkout conditions (documented fetch-depth requirements for the provenance checks)
- This repository adopts its own action on PRs (self-hosting proof point)
- A website docs page covering setup: workflow snippet, inputs, what fails vs. what warns

## Out of scope

- Any hosted Veri service or telemetry — the action runs entirely in the user's CI (DEC-002)
- Other CI providers (GitLab, Buildkite); the CLI remains the portable path for them
- Auto-fixing or auto-committing anything from CI
- Approval semantics in CI (approvals riding through PR review belongs to the team-story work order)

## Requirements

- [[REQ-021]] — extends
- [[REQ-002]] — depends-on
- [[REQ-012]] — extends
- [[DEC-002]] — constrained-by

## Acceptance tests

- [x] A PR introducing a gate violation (e.g. a work order going in-progress against an unapproved requirement) fails the action with the violation named in the check output (verified live on a scratch project: `::error` annotation naming the WO and the draft REQ, exit 1)
- [x] A PR introducing only advisories (stamp drift, receipt naming files a commit didn't touch) passes by default but shows annotations on the affected documents (verified on this repo: WO-034's receipt-prefix advisory as a `::warning`, exit 0)
- [x] Setting the escalation input turns those advisories into failures (verified: strict-advisories=true → explanatory `::error`, exit 1)
- [x] Receipt commit verification works on a default shallow checkout or the docs state the exact fetch-depth needed, and the action fails informatively rather than falsely when history is missing (verified on a depth-1 clone: provenance skips with a `::notice` carrying the fetch-depth: 0 hint; docs state the requirement)
- [ ] This repo runs the action on its own PRs and it is green on main (workflow committed; needs the local commits pushed to GitHub for a live run)
- [x] The website documents install-to-green in one page with a copy-pasteable workflow snippet (site/docs/ci.html, linked from every docs page's strip)

## Receipts

- 2026-08-24 — 2b49730 — packages/cli/src/commands.ts, packages/action/src/main.ts, packages/action/src/report.ts, packages/action/build.mjs, action.yml, action/dist/index.js, .github/workflows/veri-check.yml, .github/workflows/ci.yml, site/docs/ci.html, veri/decisions/DEC-069-the-ci-surface-is-a-bundled-node-action-wrapping-the-cli-s-s.md — Implemented the Veri Check action per DEC-069 (proposed): checkReport extracted as the shared derivation, zero-dep bundled runner with error/warning/notice annotations and strict-advisories escalation, self-adoption workflow, bundle-freshness CI step, ci.html docs; all suites green (541 tests), live-verified gate failure, advisory pass, escalation, and shallow-checkout skip — the green-on-main box awaits a push to GitHub.
