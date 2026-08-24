---
id: REQ-028
type: requirement
title: "Releases are legible and the release pipeline cannot fail on non-release tags"
status: accepted
approved: 2026-08-24
created: 2026-08-24
updated: 2026-08-24
links:
  - id: SRC-040
    rel: derived-from
  - id: REQ-023
    rel: consistent-with
  - id: REQ-025
    rel: consistent-with
---

The release surface must read as professionally as the pipeline behind it, and the pipeline must be safe to share a tag namespace with the GitHub Action's version tags.

What must hold:

- Pushing a tag that is not an app release (the action's major tags like `v1`, or any tag not matching the app version) never produces a failed release run — the pipeline recognizes non-release tags and passes without building ([[SRC-040]]: the v1/v1.0.0 pushes left two failed runs heading the Actions tab).
- Every app release's notes open with a human-readable statement of what changed, above the artifact-size manifest the pipeline already produces. A CHANGELOG.md in the repo is the single source those notes are drawn from; a release cannot ship without its changelog entry.
- Both release rituals — the app flow (version bump, tag, CI publishes) and the action flow (retag the major tag onto the verified commit) — are written down in the repository, not tribal knowledge.
- Continuous-integration triggers reference only branches that exist.

This governs presentation and pipeline safety only: signing, notarization, the updater feed, and the size gate ([[REQ-023]]) are untouched.

## Acceptance criteria

- [ ] A pushed non-app tag results in a green (skipped) release run, verified live
- [ ] CHANGELOG.md exists and the pipeline refuses an app release whose version has no changelog section
- [ ] The next app release's notes show "what changed" above the sizes
- [ ] A releasing runbook in the repo covers both flows end to end
