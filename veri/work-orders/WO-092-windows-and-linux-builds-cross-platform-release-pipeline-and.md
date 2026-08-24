---
id: WO-092
type: work-order
title: "Windows and Linux builds: cross-platform release pipeline and CI test matrix"
status: backlog
created: 2026-08-24
updated: 2026-08-24
links:
  - id: REQ-030
    rel: implements
  - id: REQ-023
    rel: consistent-with
  - id: DEC-063
    rel: constrained-by
  - id: WO-081
    rel: related
---

## Summary

Implements [[REQ-030]]. The Tauri 2 shell ([[DEC-063]]) is cross-platform by construction; what is missing is pipeline and proof. This WO extends the release workflow with Linux (AppImage and .deb) and Windows (NSIS) bundle targets and updater artifacts, adds Windows and Linux runners to the CI test matrix for the pure-Node packages (core, cli, mcp, action), fixes whatever platform-specific breakage the matrix surfaces (path separators, git invocation, line endings), and updates the site's download surface and platform statement ([[WO-084]]'s honesty bar) to say exactly what ships and with what signing caveats. Windows code signing is expected to be deferred by decision — an unsigned NSIS installer with a documented SmartScreen caveat beats silence — and that deferral must be recorded as a proposed DEC with costs.

## In scope

- Release workflow matrix: linux (ubuntu runner → AppImage + .deb + updater artifacts) and windows (windows runner → NSIS + updater artifacts) targets added to the existing tag-triggered pipeline, size-gated like the DMGs
- CI test matrix: core/cli/mcp/action suites on windows-latest and ubuntu-latest (ubuntu may already run — verify) in the existing CI workflow; fix real failures, never skip them
- A proposed DEC recording the signing posture per platform (Windows signing deferred or implemented; Linux signing story) with rejected alternatives
- Site: download band and platform statements updated to list per-platform artifacts and caveats truthfully once builds exist in a release
- Sidecar/runtime audit: the Node sidecar bundling ([[DEC-063]]) works on each target or the gap is named

## Out of scope

- Windows/Linux code-signing certificates and their purchase/setup if the DEC defers them
- Homebrew/winget/apt distribution channels ([[WO-081]]'s DEC governs channels)
- UI changes beyond what cross-platform bugs force (design gate applies if any packages/ui change is needed)
- Auto-update verification on physical hardware beyond what CI/VMs can prove — gaps stated, not faked

## Requirements

- [[REQ-030]] — implements
- [[REQ-023]] — consistent-with

## Acceptance tests

- [ ] A tagged release (or a workflow-dispatch dry run) produces installable Linux AppImage/.deb and Windows NSIS artifacts alongside the DMGs, all under the size gate
- [ ] CI runs the four Node package suites green on macOS, Linux, and Windows runners
- [ ] The signing-posture DEC is filed with rejected alternatives (approval is the owner's act)
- [ ] The site's platform statement matches shipped reality per platform, including caveats
- [ ] veri check zero issues; npm test green

## Receipts

(none yet)
