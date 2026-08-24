---
id: WO-078
type: work-order
title: "Open-source table stakes: license, repo profile, README accuracy"
status: done
created: 2026-08-24
updated: 2026-08-24
links:
  - id: REQ-027
    rel: implements
  - id: DEC-074
    rel: constrained-by
  - id: SRC-040
    rel: informed-by
---

## Summary

Close the gaps that make the project legally and visibly not-open-source: choose and apply a license, fill in the empty GitHub repository profile, and bring the README up to date and up to standard. The license choice itself (MIT vs Apache-2.0 vs source-available split between app and format/action) is Daniel's call and must be filed as a proposed DEC before the LICENSE file lands; everything else is mechanical. Evidence: SRC-040 — the repo currently reports licenseInfo: null, an empty description/homepage/topics, and a README that still calls the app Electron.

## In scope

- A proposed DEC naming the license (with alternatives rejected), then LICENSE at the repo root and a `license` field in every package.json once approved
- GitHub repo profile: description, homepage URL (https://danielyayla.github.io/veri/), topics (mcp, claude-code, coding-agents, knowledge-base, developer-tools, tauri), social-preview image from site/assets/og.png
- README fixes: "Electron" → Tauri 2 for @veri/ui; one app screenshot near the top (light/dark via `<picture>`, reusing site/assets/app-*.png); CI, release-version, and license badges; a one-line "who this is for" sentence
- A short "Platforms" statement in README and on the site: macOS 13+ app today, CLI/MCP/action are cross-platform Node, and whether Windows/Linux builds are planned
- Consolidate the Node-version story into one authoritative statement (dev needs >= 22.18, published output targets >= 20)
- Consider moving the 30-line MCP tool listing from the README to the reference page, leaving a link

## Out of scope

- CONTRIBUTING, SECURITY, and other community files (the contributor-onramp work order)
- Release pipeline and changelog changes (the release-hygiene work order)
- Any website redesign — the site is good; only the platform statement touches it
- Publishing packages to npm (the distribution work order)

## Requirements

- [[SRC-040]] — informed-by

## Acceptance tests

- [x] A DEC recording the license choice is approved, LICENSE exists at the root, and GitHub's repo page renders the license chip
- [x] Every package.json declares the matching `license` field
- [x] Repo description, homepage, topics, and social-preview image are set (visible via `gh repo view` and the repo page) — description/homepage/topics verified live; social-preview image uploaded manually by Daniel (2026-08-24)
- [x] README nowhere mentions Electron, shows a screenshot and badges, and states the platform scope
- [x] One place states the authoritative dev Node version; README, CONTRIBUTING (when it lands), and CI agree with it

## Receipts

- 2026-08-24 — 3222b02 — LICENSE, package.json, packages/{core,cli,mcp,action,ui}/package.json, README.md, site/index.html, site/docs/reference.html, veri/decisions/DEC-073, veri/decisions/DEC-074, veri/requirements/REQ-027, veri/work-orders/WO-078, veri/ids — Apache-2.0 licensed (DEC-074 approved by Daniel in-session; parallel MIT proposal DEC-073 superseded), license fields in all six manifests, repo description/homepage/topics set via gh, README badges/screenshot/who-for/Platforms landed (folding in a parallel session's edits per Daniel), MCP tool listing moved to the reference page. GitHub license detection verified live (apache-2.0). Social-preview upload remains a manual Settings step.
