---
id: REQ-030
type: requirement
title: "The desktop app and CLI run on Windows and Linux"
status: accepted
approved: 2026-08-24
created: 2026-08-24
updated: 2026-08-24
links:
  - id: DEC-063
    rel: depends-on
  - id: REQ-012
    rel: extends
  - id: REQ-023
    rel: consistent-with
---

Veri ships macOS-only today: the release pipeline builds signed per-architecture DMGs and nothing else, and the site's platform statement tells non-Mac developers only what does not exist for them. The developer audience Veri targets works on all three platforms — Linux especially. The Tauri 2 migration ([[DEC-063]]) removed the main obstacle: the shell is cross-platform by construction, so Windows and Linux builds are chiefly release-pipeline work (bundling targets, updater artifacts, signing stories per platform) rather than product work.

The CLI, MCP server, and GitHub Action are pure Node and nominally cross-platform already, but none of them is tested anywhere but macOS CI and Ubuntu CI; path handling and git invocation must be verified on Windows.

## Acceptance criteria

- [ ] The release pipeline produces installable Linux artifacts (AppImage and/or .deb) and a Windows installer (NSIS or MSI) for tagged releases, alongside the existing DMGs
- [ ] Auto-update works on each added platform, or the platform's release notes state plainly that updates are manual, with the gap tracked
- [ ] CI runs the core/cli/mcp/action test suites on Windows and Linux runners; platform-specific failures are fixed, not skipped
- [ ] The site's download surface and platform statement reflect what actually ships, per platform, with honest signing caveats (unsigned/Gatekeeper-equivalent warnings named)
- [ ] Code signing on Windows (and notarization-equivalents) is either implemented or explicitly deferred by an approved decision recording the cost
