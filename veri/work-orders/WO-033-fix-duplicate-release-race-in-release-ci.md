---
id: WO-033
type: work-order
title: Fix electron-builder duplicate-release race in release CI
status: backlog
created: 2026-08-17
updated: 2026-08-17
links:
  - id: WO-028
    rel: extends
  - id: REQ-011
    rel: implements
---

## Summary

The first live release run (v0.1.1, actions run 32033080631)
exposed a race in `npx electron-builder --mac --publish always`:
the DMG and zip targets each called "create GitHub release"
concurrently, producing two draft releases for the same tag with
the assets split between them (one held only the DMG blockmap; the
other held the DMG, zip, zip blockmap, and latest-mac.yml). The
drafts had to be consolidated and the stub deleted by hand. Left
unfixed, every tag push risks a split release, and a split
`latest-mac.yml` feed would break auto-update.

## In scope

- Make the release job produce exactly one release per tag.
  Candidate fixes to evaluate (file the choice as a proposed DEC):
  pre-creating the draft release with `gh release create --draft`
  before electron-builder runs so publish only uploads; upgrading
  electron-builder if the race is fixed upstream; or serializing
  the publish step.
- A post-publish CI check that the tag has exactly one release
  containing the DMG, zip, both blockmaps, and latest-mac.yml.

## Out of scope

- Code signing and notarization secrets (tracked in WO-028).
- Windows/Linux targets.

## Requirements

- [[REQ-011]] — packaged releases and auto-update: the release feed
  (latest-mac.yml plus artifacts) must land intact on a single
  release per tag.

## Acceptance tests

- [ ] A tag push produces exactly one release with the full asset
      set (DMG, zip, both blockmaps, latest-mac.yml), verified on a
      real run.
- [ ] CI fails loudly if the asset set is incomplete or split
      across duplicate releases.

## Receipts

