---
id: WO-034
type: work-order
title: Verify signed auto-update end to end
status: backlog
created: 2026-08-17
updated: 2026-08-17
links:
  - id: REQ-011
    rel: implements
  - id: WO-028
    rel: extends
  - id: WO-033
    rel: extends
---

## Summary

The 2026-08-17 unsigned-build test (0.1.1 installed, 0.1.3
published) proved the update pipeline up to its final step: feed
discovery, full-zip download to the updater cache, the consent
dialog, and the install-on-quit handoff all worked, and then
Squirrel.Mac rejected the swap — "code object is not signed at
all" (SQRLCodeSignatureErrorDomain) — leaving the app at 0.1.1.
That is macOS's signing constraint, not a pipeline bug. Once the
signing secrets are configured in the repo ([[WO-028]]'s remaining
manual step), rerun the test across two signed releases to verify
the swap completes and [[REQ-011]]'s acceptance criteria are
actually met.

## In scope

- With signing secrets set, publish two consecutive signed
  releases via the tag flow and confirm each passes the [[WO-033]]
  single-complete-release check.
- Install the older signed release, let the updater bring it
  current, and verify: Gatekeeper accepts the install with no
  warnings, the update applies on quit (and on Restart Now), and
  the updated app reports the new version.
- Verify the second update onward downloads differentially (the
  updater cache retains the previous zip; the first update is
  always a full download).
- Check off the [[REQ-011]] acceptance criteria this run proves.

## Out of scope

- Obtaining or configuring the certificates and notarization
  credentials themselves (user-held; tracked in WO-028).
- Windows/Linux update paths.

## Requirements

- [[REQ-011]] — installable, self-updating desktop app
  distribution: signed artifacts, automatic consensual updates,
  incremental downloads.

## Acceptance tests

- [ ] A clean-machine install of a signed release opens with no
      Gatekeeper override needed.
- [ ] An installed older signed version becomes current
      automatically, with the update applying only on consent
      (Restart Now) or on quit.
- [ ] A subsequent update downloads differentially rather than as
      a full artifact.

## Receipts

(none yet)
