---
id: WO-034
type: work-order
title: Verify signed auto-update end to end
status: done
created: 2026-08-17
updated: 2026-08-19
links:
  - id: REQ-011
    rel: implements
  - id: WO-028
    rel: extends
  - id: WO-033
    rel: extends
  - id: SRC-011
    rel: designed-by
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

- [x] A clean-machine install of a signed release opens with no
      Gatekeeper override needed.
- [x] An installed older signed version becomes current
      automatically, with the update applying only on consent
      (Restart Now) or on quit.
- [x] A subsequent update downloads differentially rather than as
      a full artifact.

## Receipts

- 2026-08-19 · commit 74e3d83 · files: packages/ui/package.json,
  package-lock.json (version bumps v0.1.4–v0.1.7), this WO,
  REQ-011. Signed auto-update verified end to end on macOS 15.7.3.
  Daniel created the Developer ID Application certificate and set
  the five signing secrets (a first attempt stored an empty
  CSC_LINK — wrong .p12 path — producing one unsigned draft build,
  clobbered by a signed re-run of the same tag). Four signed,
  notarized releases published via the tag flow (v0.1.4–v0.1.7);
  every run passed the WO-033 single-complete-release check. First
  notarizations queued ~2h at Apple (new team); subsequent ones
  ~2min. Verified: quarantined v0.1.4 DMG assessed
  `accepted / source=Notarized Developer ID` by spctl, staple
  valid, launched with no override; 0.1.4→0.1.5 update applied
  only on Daniel's Restart Now click (full download after the
  differential attempt fell back — updater cache held a stale zip
  from the 2026-08-17 unsigned test); 0.1.5→0.1.6 downloaded
  differentially (88,384 KB of 202,694 KB, 44%) and validated;
  0.1.6→0.1.7 downloaded differentially and applied on quit with
  the consent dialog untouched. Running app reports 0.1.7 in the
  Settings view (WO-036 `veri:app-info`), matching the published
  release. REQ-011 boxes checked except offline-launch behavior,
  which this run did not exercise.
- 2026-08-19 · commit 2b26030 · files: REQ-011, this WO.
  Feed-unreachable launch verified: Veri 0.1.7 launched with
  `--proxy-server=127.0.0.1:9` (feed unreachable for the app only,
  no system changes) — app launched and opened the project
  normally, the failed check appeared only in main.log
  (`update check failed: net::ERR_PROXY_CONNECTION_FAILED`), and
  the `UpdateStatus` IPC shape carries no error field, so no UI
  surface can differ from up-to-date. Last REQ-011 box checked.
