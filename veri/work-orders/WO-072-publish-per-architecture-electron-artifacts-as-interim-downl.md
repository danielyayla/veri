---
id: WO-072
type: work-order
title: "Publish per-architecture Electron artifacts as interim download-size mitigation"
status: backlog
created: 2026-08-20
updated: 2026-08-20
links:
  - id: REQ-023
    rel: mitigates
  - id: SRC-037
    rel: informed-by
---

## Summary

Interim mitigation for REQ-023, not its implementation: stop shipping the universal macOS binary and publish arm64 and x64 artifacts separately, roughly halving the download a user actually takes (~194 MB universal DMG → ~110 MB per-arch). Electron's framework floor means this cannot reach the 50 MB ceiling — it exists to cut the pain for the next downloader in days, while WO-073 (the Tauri 2 migration) delivers the requirement. Deliberately tiny: an electron-builder target change, updater feed verification, and release-note wording so existing universal installs keep updating.

## In scope

- electron-builder.yml: replace `arch: [universal]` with separate arm64 and x64 dmg+zip targets
- Verify electron-updater serves the right per-arch artifact to existing installs (latest-mac.yml feed carries both; a universal 0.1.x install must successfully update to its native slice)
- Release artifact sizes recorded in the release notes (REQ-023's visibility criterion, early)
- One release cut and its sizes measured

## Out of scope

- Meeting REQ-023's 50 MB ceiling (impossible on Electron; that is WO-073)
- Dropping Intel support
- Any change to app code, signing identity, or notarization flow

## Requirements

- [[REQ-023]] — mitigates
- [[SRC-037]] — informed-by

## Notes

- 2026-08-21 — Likely obsolete: [[WO-073]] landed the same day, with
  per-arch Tauri DMGs measured 41.9/43.8 MB. This WO retains value
  only if the v0.2.0 release is delayed long enough that an interim
  Electron cut is worth its CI cost — Daniel's call; left in backlog.

## Resolution

2026-08-24 — Overtaken by events; closed without performing the work.
This WO was an interim mitigation whose only value was buying days
while [[WO-073]] (the Tauri 2 migration, [[DEC-063]]) was pending.
The Notes entry above already flagged the condition: it retained value
only if the v0.2.0 release was delayed. It was not — [[WO-073]] landed
2026-08-21, the same day this WO's obsolescence note was written, and
v0.2.0/v0.2.1 shipped as Tauri releases that day with per-architecture
DMGs measured 41.9 MB (arm64) / 43.8 MB (x64), under [[REQ-023]]'s
50 MB ceiling that this WO could never reach. Everything this WO
existed to deliver now holds, better, in the shipped reality:

- Per-architecture artifacts: the Tauri pipeline builds per-arch DMGs
  and updater archives (.github/workflows/release.yml).
- Sizes visible at cut time: release notes carry a size manifest and
  the pipeline fails any release whose DMG crosses 50 MB ([[DEC-065]]).
- Existing universal 0.1.x installs are not stranded: [[DEC-064]]'s
  bridge release 0.1.8 is the Electron line's terminal version and
  walks installs to the Tauri line.

There is no Electron shell left to mitigate — electron-builder.yml
and the Electron main/preload were deleted from main in [[WO-073]]
(commit b5874ec), and no workflow references Electron. Building the
interim Electron artifacts now would be pure waste.

## Acceptance tests

- [x] Per-arch DMG and zip artifacts build, sign, and notarize — obviated by the Tauri migration: the Electron shell was removed ([[WO-073]], commit b5874ec deleted electron-builder.yml); per-arch signed/notarized DMGs ship from the Tauri pipeline instead (.github/workflows/release.yml, releases v0.2.0/v0.2.1)
- [x] Measured arm64 DMG is at or under ~115 MB and stated in the release notes — obviated: the shipped arm64 DMG is 41.9 MB ([[WO-073]] receipt), far under this interim target, and every release's notes state per-artifact sizes with a 50 MB gate ([[DEC-065]])
- [x] A universal-install machine auto-updates to the per-arch build successfully — obviated: no per-arch Electron build ever existed to update to; universal 0.1.x installs instead reach terminal release 0.1.8 and cross to the Tauri line via the [[DEC-064]] bridge
- [x] veri check clean — run at closure, 2026-08-24, zero issues (known WO-034 advisory aside)

## Receipts

(none yet)
