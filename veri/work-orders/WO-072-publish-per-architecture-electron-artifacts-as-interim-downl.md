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

## Acceptance tests

- [ ] Per-arch DMG and zip artifacts build, sign, and notarize
- [ ] Measured arm64 DMG is at or under ~115 MB and stated in the release notes
- [ ] A universal-install machine auto-updates to the per-arch build successfully
- [ ] veri check clean

## Receipts

(none yet)
