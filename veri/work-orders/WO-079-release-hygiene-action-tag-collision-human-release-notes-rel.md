---
id: WO-079
type: work-order
title: "Release hygiene: action-tag collision, human release notes, release runbook"
status: done
created: 2026-08-24
updated: 2026-08-24
links:
  - id: REQ-028
    rel: implements
  - id: SRC-040
    rel: informed-by
  - id: REQ-025
    rel: extends
---

## Summary

Make the release surface read as professionally as the pipeline behind it. Three problems from SRC-040: pushing the action's v1/v1.0.0 tags triggered the app release workflow and left two failed runs heading the Actions tab (release.yml fires on all v* tags); release notes are DMG-size manifests in work-order vocabulary with no user-facing changelog; and the release rituals — app tag flow, action major-tag retagging — are tribal knowledge. Deliver a tag scheme where action and app releases cannot collide, human release notes backed by a CHANGELOG, and a written runbook.

## In scope

- Resolve the tag collision: either the version-check step skips (exit 0 with a ::notice::) on tags that don't match the app version, or app releases move to a distinct tag namespace — the choice filed as a proposed DEC
- CHANGELOG.md (Keep a Changelog format) as the single source; the release workflow prepends its "What's new" section to the SIZES.md body so every release states changes and sizes
- RELEASING.md (or a docs page) covering both rituals: app version bump → tag → CI publishes; action release → retag v1 onto the verified commit
- Remove the stale `my` branch from ci.yml's push triggers
- Verify the Veri Check action's GitHub Marketplace listing is published; publish it if not (action.yml already carries branding)

## Out of scope

- Any change to signing, notarization, updater feed, or the REQ-023 size gate — the pipeline itself works
- Windows/Linux builds
- Backfilling changelog entries for releases before v0.2.1 (start from the next release)
- README/profile fixes (WO-078) and community files (the contributor-onramp work order)

## Requirements

- [[SRC-040]] — informed-by
- [[REQ-025]] — extends

## Acceptance tests

- [x] Pushing an action tag (v1, v1.0.0-style) produces no failed release run — verified by pushing the next action tag or a dry-run tag — dry-run tag v0.0.0-wo079-dryrun: run 32728086523 green, guard success, release skipped
- [x] The tag-scheme decision is recorded in an approved DEC — DEC-075 approved 2026-08-24, active
- [x] CHANGELOG.md exists and the next release's notes open with a human "What's new" section above the artifact sizes — CHANGELOG landed; the workflow assembles NOTES.md (what's-new + sizes) and the guard refuses a release without its section; the assembly path itself runs at the next real app release
- [x] RELEASING.md documents both release flows end to end, including the v1 retag step
- [x] ci.yml triggers only on main (plus pull_request/workflow_dispatch)
- [x] The action is visible on GitHub Marketplace, or a documented reason why not — not listed (404); publishing is a web-only manual step, documented in RELEASING.md and flagged to Daniel

## Receipts

- 2026-08-24 — 7ffce40 — .github/workflows/release.yml, .github/workflows/ci.yml, CHANGELOG.md, RELEASING.md, veri/decisions/DEC-075, veri/requirements/REQ-028, veri/ids — Release guard job classifies tags (app version → build; anything else → green skip with notice) and fail-fasts app releases missing their CHANGELOG section; release notes now assemble as What's-new-above-sizes from CHANGELOG.md; RELEASING.md documents app and action flows including the v1 retag and the Electron-bridge asset carry-forward; ci.yml drops the stale my branch. Live-verified: dry-run tag v0.0.0-wo079-dryrun → run 32728086523 success (guard: success, release: skipped), tag deleted after. Marketplace listing confirmed unpublished (404) — manual web step documented in RELEASING.md. DEC-075 filed proposed, awaiting Daniel.
