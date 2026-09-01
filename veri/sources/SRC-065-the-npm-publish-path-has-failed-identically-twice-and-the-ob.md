---
id: SRC-065
type: source
title: "Observed — the npm publish path has failed identically twice, and the objection that ruled out the fix has expired"
status: imported
kind: outcome
created: 2026-08-29
updated: 2026-09-02
links:
  - id: WO-125
    rel: outcome-of
  - id: WO-140
    rel: informed-by
  - id: REQ-028
    rel: tests
  - id: REQ-012
    rel: tests
  - id: DEC-077
    rel: derived-from
---

First-hand record of the `npm-publish` workflow failing during the
v0.5.0 release, and of the same failure having gone unrecorded during
v0.4.0. Filed as evidence rather than as a bug: nothing malfunctioned.
npm enforced 2FA exactly as configured, and the cost of that being
unresolvable from CI is the finding.

## What happened

On 2026-08-29, with `v0.5.0` tagged, released, and its bridge assets
verified, the npm half of the release was attempted through the
sanctioned path in RELEASING.md — the `npm-publish` workflow, dry-run
first.

1. **The dry run passed** (run `33260124336`, 48s). The DEC-077
   lockstep guard reported `core=0.1.2 cli=0.1.2 mcp=0.1.2`. All three
   tarballs looked correct: `@verikb/core` 77 files / 115.3 kB,
   `@verikb/cli` 67 files / 74.3 kB, `@verikb/mcp` 27 files / 25.7 kB,
   with all nine `MET-` method documents bundled into the CLI package
   as `veri skills install` requires.

2. **The real run failed** (run `33260204206`) at the first
   `npm publish`, before any package was sent:

   > npm error code EOTP
   > npm error This operation requires a one-time password from your
   > authenticator.

   No partial publish resulted — all three packages remained at 0.1.0
   on the registry, verified afterwards.

## Why it matters more than one failed run

This is the second occurrence, not the first. The same step was in
[[WO-125]]'s original scope for the v0.4.0 release on 2026-08-27 and
never completed; that work order was left in-progress with no receipt,
and the omission was only found two days later during a record sweep.
The failure is therefore not merely repeatable — it is *quiet*. A
release can appear to have shipped while half of it did not.

The standing consequence: `@verikb/{core,cli,mcp}` have been at 0.1.0
since 2026-08-25 while the manifests carry 0.1.2. A user following the
site's install instructions gets a reader that predates the format
marker work entirely and refuses every current project, this one
included. That is [[REQ-012]]'s install path and [[REQ-028]]'s
written-down release pipeline both failing in practice. Filed as
evidence testing both: what it shows is the requirements unmet, not
the requirements wrong — which of those it is, is a judgment for the
maintainer, not for this document.

## The finding that unblocks it

[[WO-081]]'s receipt (2026-08-25) records trusted publishing being
considered and rejected, in its own words, because "trusted publishing
cannot bootstrap a first publish" — alongside the discovery that a
no-bypass granular token yields `E403` from CI. Both observations were
correct at the time.

The first one has since expired. Daniel published 0.1.0 manually with
an OTP on that same date, so all three packages now exist on the
registry and the bootstrap case has already happened. The reason
trusted publishing was ruled out no longer holds, and nothing has
replaced it. [[WO-140]] carries the conversion.

## What this does not show

- Nothing here indicates the packages themselves are wrong. The dry
  run's contents were correct, and the published 0.1.0 was verified
  working from a clean directory when it shipped.
- Whether an installed 0.4.0 app updates to 0.5.0 and opens a format-4
  project is a separate, still-unverified claim. It needs a machine
  carrying the old app and was not tested here.
