---
id: DEC-075
type: decision
title: "App and action tags share the v* namespace; a guard job separates them"
status: proposed
created: 2026-08-24
updated: 2026-08-24
links:
  - id: WO-079
    rel: constrains
  - id: REQ-028
    rel: satisfies
---

## Choice

The release workflow keeps its `tags: ["v*"]` trigger, and a fast ubuntu guard job decides what a tag means: a tag equal to `v<packages/ui version>` is an app release and proceeds to the macOS build; any other v* tag (the action's `v1`, `v1.0.0`, future action versions) ends the run green with a ::notice::. The guard also fail-fasts an app release whose version has no CHANGELOG.md section, before the ten-minute build. Documented for humans in RELEASING.md.

## Rejected alternatives

- **Separate tag namespace for the app (`app-v*`)** — cleanly avoids the collision but breaks the established convention (nine v0.x app tags exist), complicates the tag-is-the-version story in RELEASING/docs, and still needs guard logic the day any other v-tag appears.
- **Narrow the trigger to a version pattern (`v[0-9]+.[0-9]+.[0-9]+`)** — does not actually separate the namespaces: the action's own semver tags (v1.0.0) match it, so the collision survives exactly where it bit.
- **Rename the action's tags (`action-v1`)** — contradicts the GitHub Marketplace convention and the already-published `uses: danielyayla/veri@v1` documentation; consumer-visible breakage to fix an internal workflow concern.

## Rationale

SRC-040 found the collision live: pushing the action's v1/v1.0.0 tags failed the release workflow's tag-vs-app-version check twice. The action's `@v1` convention is already published in the CI docs and consumed by veri-check.yml, so the action keeps plain v-tags; making the app workflow tag-aware is the change with zero consumer impact. A skipped-but-green run also leaves an auditable record that the tag was seen and classified, which a narrower trigger pattern would not.
