---
id: DEC-032
type: decision
title: CI pre-creates the release draft before electron-builder publishes
status: proposed
created: 2026-08-17
updated: 2026-08-17
links:
  - id: WO-033
    rel: constrains
  - id: DEC-028
    rel: refines
  - id: DEC-029
    rel: refines
---

## Choice

The release workflow creates the draft GitHub release itself (`gh
release create --draft --verify-tag`) before invoking electron-builder,
and after publishing asserts that the tag has exactly one release
carrying the full asset set (DMG, zip, both blockmaps, latest-mac.yml),
failing the job otherwise. electron-builder's per-target publishers
then only ever find-and-upload; the create path that raced on the
v0.1.1 run (two concurrent "release doesn't exist" creates, assets
split across two drafts) is never exercised.

## Rejected alternatives

- **Upgrade electron-builder and hope the race is fixed upstream** —
  the concurrent create in GitHubPublisher is long-standing and not
  clearly fixed in any release; even if a fix lands, an upstream
  behavior we don't control is a weaker guarantee than making the
  create unconditional and idempotent on our side. An upgrade can
  still happen independently.
- **Serialize the publish step** (build targets in separate sequential
  electron-builder invocations) — doubles packaging time for the
  universal build and fights the tool's design; the race is in
  release creation, not uploading, so serializing everything is
  overkill.
- **Publish with `--publish never` and upload artifacts with gh
  afterwards** — sidesteps electron-builder's publisher entirely, but
  reimplements what it already does correctly (uploads, blockmap and
  latest-mac.yml generation are coupled to the publish flow) and
  risks drift between the feed metadata and what actually shipped —
  the property [[DEC-028]] chose electron-builder to guarantee.

## Rationale

Pre-creating the release removes the shared-state race by removing
the contested operation: creation happens once, serially, before any
concurrent publisher runs, and electron-builder's find-existing path
(which is race-free) does the rest. The post-publish assertion turns
the remaining failure modes — a future regression, a partial upload —
into a red CI run instead of a silently split update feed, which is
the failure [[DEC-029]]'s static-feed posture can least afford.
