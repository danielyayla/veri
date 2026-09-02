---
id: WO-165
type: work-order
title: "Release automation: the Electron-bridge assets attach in CI, retiring RELEASING.md's manual step 6"
status: in-progress
approved: 2026-09-02
claimed_by: fable-wo165
claimed_at: 2026-09-02
created: 2026-09-02
updated: 2026-09-02
links:
  - id: REQ-011
    rel: serves
  - id: DEC-064
    rel: constrained-by
  - id: REQ-028
    rel: constrained-by
# binds:         # code this work order claims (optional)
#   paths: []    # repo-root-relative globs
#   tests: []    # test files proving it (path or path::name)
# verify:        # one command that must exit 0 to prove the change (the agent harness runs it, never Veri)
---

## Summary

Every app release must carry the Electron-bridge files — Veri-0.1.8-universal-mac.zip, its .blockmap, and latest-mac.yml — so 0.1.x installs' electron-updater (which reads the latest release) can still reach 0.1.8 and see the bridge dialog ([[DEC-064]]). Today this is RELEASING.md step 6, a manual copy-forward performed by hand after publishing; it was executed manually again for v0.6.0 (2026-09-02). This work order moves the copy into the release workflow: CI attaches the three bridge assets to the draft release it creates, so a published release can never ship without them and step 6 leaves RELEASING.md.

## In scope

- The release workflow attaches the three 0.1.8 bridge assets (Veri-0.1.8-universal-mac.zip, Veri-0.1.8-universal-mac.zip.blockmap, latest-mac.yml) to the draft release it builds, sourced from the published v0.1.8 release
- An integrity check in the job: the fetched zip's sha512 must match the value pinned in latest-mac.yml before attaching — a corrupted or substituted download fails the job
- RELEASING.md: step 6 becomes a verification note (confirm the assets are on the release) instead of a manual procedure
- The attach step is scoped to app-version tags only — the non-app-tag passthrough ([[REQ-028]]) is untouched

## Out of scope

- Any change to the 0.1.8 release itself or the bridge dialog behavior (DEC-064 is settled; the Electron line stays terminal)
- Retiring the bridge — deciding when 0.1.x installs no longer need the crossing is its own future decision
- Changes to updater feeds (latest.json generation) or signing

## Acceptance tests

- [ ] A workflow run on an app-version tag produces a draft release carrying all three bridge assets with no manual copy (proves REQ-011: 0.1.x installs keep an upgrade path on every release)
- [ ] The attached zip's sha512 matches the value inside the attached latest-mac.yml, and the job fails if the fetched asset does not (proves the bridge cannot silently corrupt)
- [ ] A non-app tag still passes through the pipeline green with no attach attempt (proves REQ-028 is untouched)
- [ ] RELEASING.md no longer instructs a manual copy; the step reads as verification only

## Receipts

(none yet)
