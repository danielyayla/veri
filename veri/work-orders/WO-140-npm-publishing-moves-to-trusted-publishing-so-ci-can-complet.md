---
id: WO-140
type: work-order
title: "npm publishing moves to trusted publishing, so CI can complete a release"
status: done
claimed_by: opus-wo140
claimed_at: 2026-09-01
approved: 2026-08-29
created: 2026-08-29
updated: 2026-09-02
links:
  - id: REQ-028
    rel: extends
  - id: REQ-012
    rel: extends
  - id: DEC-077
    rel: constrained-by
  - id: WO-125
    rel: follows-from
  - id: WO-081
    rel: follows-from
  - id: SRC-065
    rel: derived-from
binds:
  paths:
    - .github/workflows/npm-publish.yml
    - RELEASING.md
---

## Summary

The `npm-publish` workflow cannot complete a publish, and has now
failed the same way twice. `NPM_TOKEN` is a granular token that does
not bypass 2FA, so the publish step dies on `EOTP` — "this operation
requires a one-time password from your authenticator" — which no
repository secret can supply.

The cost is not theoretical. `@verikb/{core,cli,mcp}` are still at
0.1.0 while the manifests carry 0.1.2: v0.4.0's npm half never shipped
for this reason and was quietly left undone, and v0.5.0's hit the
identical failure on 2026-08-29 (run 33260204206). A user running
`npx @verikb/cli` today gets a format-2 reader that refuses every
format-4 project, including this one.

The blocker that ruled this out before is gone. [[WO-081]]'s receipt
records trusted publishing being rejected because it "cannot bootstrap
a first publish" — true at the time, and no longer true: 0.1.0 was
published manually with an OTP and the packages exist on the registry.
The bootstrap case that blocked the conversion has already happened.

## In scope

- Configure trusted publishing (OIDC) on npmjs.com for
  `@verikb/core`, `@verikb/cli`, and `@verikb/mcp`, naming this
  repository and the `npm-publish` workflow as the trusted publisher.
  This is a registry-side act on an account the maintainer controls;
  the work order carries it as a step, not as something an agent does
- `.github/workflows/npm-publish.yml`: add `permissions: id-token:
  write`, drop `NODE_AUTH_TOKEN`/`NPM_TOKEN` from the publish step,
  and ensure the npm CLI version in the runner is new enough to
  exchange the OIDC token. Keep the dry-run default and the DEC-077
  lockstep guard exactly as they are
- Verify by publishing 0.1.2 for real through the workflow — the
  version already sitting in the manifests, which npm has never seen
- Remove the `NPM_TOKEN` repository secret once a publish has
  succeeded without it, so no stale write credential remains
- `RELEASING.md`: replace the npm section's token-and-2FA caveat with
  the trusted-publishing flow, and record that a first publish still
  needs a manual OTP (the bootstrap case), so the next person
  scaffolding a new package is not surprised

## Out of scope

- Any package content, version scheme, or scope change — DEC-077's
  lockstep 0.x line and the `@verikb` scope stand unchanged
- The app release flow and the action release flow; this touches the
  npm path only
- Publishing `@verikb/ui` or `@verikb/action`, which are private and
  stay private

## Requirements

Extends [[REQ-028]] — a release pipeline that cannot complete its own
publish is not a pipeline that has been written down and made safe,
and the runbook currently documents a step that fails every time.
Extends [[REQ-012]] — the site tells a stranger to install from npm,
so a stale registry is a broken install path. Constrained by
[[DEC-077]], whose lockstep and scope decisions are untouched.
Follows from [[WO-125]] and [[WO-081]], and derived from
[[SRC-065]], which records both failures and the expired objection.

## Acceptance tests

- [x] Trusted publishing is configured on the registry for all three
      packages, naming this repo and `npm-publish.yml`
- [x] `npm-publish.yml` declares `id-token: write` and references no
      npm write token
- [x] A dry run passes and prints the same three-package file lists it
      does today, with the lockstep guard still green
- [x] A real run publishes `@verikb/{core,cli,mcp}@0.1.2` with no OTP
      and no `NPM_TOKEN`
- [x] The published 0.1.2 reader understands format 4, proven from a
      clean install of the registry tarball: `veri init` + `veri check`
      on a fresh project reads format 4 clean (0 issues), and against
      this repository — which moved to format 5 after this work order
      was filed — it refuses with the correct update-and-restart
      message (amended from "checks this repository clean" at Daniel's
      direction, 2026-09-02: the repo outran the release again, and
      the criterion's substance is the reader's format-4 competence)
- [x] The `NPM_TOKEN` repository secret is deleted
- [x] RELEASING.md's npm section describes the OIDC flow and names the
      first-publish OTP exception
- [x] `veri check` reports zero issues

## Receipts

- 2026-09-02 — 9c8edaf — .github/workflows/npm-publish.yml, RELEASING.md — the npm publish path converted to OIDC trusted publishing: the workflow gained `id-token: write`, dropped `NODE_AUTH_TOKEN`/`NPM_TOKEN` and setup-node's registry-url, and upgrades the runner's npm (12.0.2 observed) to exchange the OIDC token; dry-run default and the DEC-077 lockstep guard untouched. Daniel configured the trusted publisher on npmjs.com for all three packages. Dry run 33509909186 green with the same three tarball file lists; real run 33558059693 published @verikb/{core,cli,mcp}@0.1.2 with no OTP and no token — the first CI publish ever to complete. The NPM_TOKEN secret is deleted. Published-reader proof ran against a clean-install of the registry tarball (fresh format-4 project: 0 issues; this format-5 repo: the correct refusal), since the repo outran the release between filing and closing — criterion 5 amended accordingly at Daniel's direction. Terminal `veri check`: format 5, 0 issues, 18 advisories; MCP run_check did not run this session (permission classifier), and the git-backed tiers ran via the terminal check
