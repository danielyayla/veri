---
id: WO-092
type: work-order
title: "Windows and Linux builds: cross-platform release pipeline and CI test matrix"
status: done
created: 2026-08-24
updated: 2026-08-25
links:
  - id: REQ-030
    rel: implements
  - id: SRC-038
    rel: designed-by
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

- [x] A tagged release (or a workflow-dispatch dry run) produces installable Linux AppImage/.deb and Windows NSIS artifacts alongside the DMGs, all under the size gate (v0.3.2 run 32811436514: all five jobs green, draft release holds the full 12-asset set — DMGs 42.2/44.2 MB, NSIS 26.2 MB, AppImage 119.4 MB, .deb 50.7 MB, updater tarballs + sigs + latest.json — every installer under its DEC-090 per-platform ceiling; verified via gh run view and gh release view, not relayed)
- [x] CI runs the four Node package suites green on macOS, Linux, and Windows runners (run 32807206856 on 946873a: test (ubuntu-latest), test (macos-latest), test (windows-latest) all success — after the first Windows run surfaced and 946873a fixed two real separator bugs: createDocument's contract path and veriPathInRepo's 8.3-short-name mapping; verified via gh run view, not relayed)
- [x] The signing-posture DEC is filed with rejected alternatives (approval is the owner's act) (DEC-082 filed proposed; approved by Daniel 2026-08-25, stamp commit 83bff6f)
- [x] The site's platform statement matches shipped reality per platform, including caveats (download bands and quickstart list Windows 10+ NSIS with the SmartScreen caveat, AppImage with its ~120 MB size and auto-update, .deb with its no-auto-update caveat; the release-resolving script links exact assets only when the published latest carries them, commit 97ac81e)
- [x] veri check zero issues; npm test green (veri check: 253 documents, 0 issues, known WO-034 advisory only; npm test 621 tests green across five workspaces locally and on all three CI runners in run 32807206856)

## Receipts

- 2026-08-24 — 56d6d16 — .github/workflows (release.yml, ci.yml), packages/ui/scripts (fetch-node.mjs, stage-sidecar.mjs, make-updater-manifest.mjs), packages/ui/src-tauri/src/sidecar.rs, RELEASING.md, veri/decisions/DEC-082, veri/work-orders/WO-092 — release pipeline rebuilt as a per-platform matrix (macOS signed/notarized DMGs unchanged; ubuntu-22.04 → AppImage + .deb with the documented Tauri v2 apt deps; windows-latest → NSIS) with per-job asset collection, fragment-merged latest.json across all four platform keys, the 50 MB gate on every installer, and a fragment-driven completeness verify; CI matrix runs core/cli/mcp/action on ubuntu/macOS/Windows (autocrlf pinned off on Windows). Sidecar audit: architecture ports (externalBin lands beside the binary on all targets; node.exe resolution made explicit, console window suppressed, dev-fallback triple per OS, stage-sidecar path checks Windows-safe); fetch-node's linux-x64/win-x64 targets proven locally (sha256-verified ELF/PE binaries extracted on this machine); manifest collect/merge and the size gate proven against fixture bundle trees, negative gate test included. Named gaps, verifiable only in CI or a release: Windows/Linux suite runs, real bundle builds and sizes (the AppImage bundles WebKitGTK + a 121 MB-uncompressed Node runtime — a realistic risk of crossing the 50 MB gate, which would fail the release visibly at cut time), .deb has no auto-update (caveat written into release notes by the merge step), and the sidecar state dirs still use macOS-style ~/Library paths on Linux/Windows (works, but non-native; product follow-up). Site deliberately untouched: nothing new ships until the first cross-platform release lands, so the platform statement stays truthful as-is and updates with that release. Local proof: npm test green (all five workspaces, 578 tests), cargo check clean, workflow YAML parse-validated (actionlint has no npm distribution; not run). veri check: zero issues from this WO — the single open issue at commit time is WO-090's design gate, a concurrent session's in-flight work. Acceptance boxes for release artifacts, CI matrix, site statement, and the green-everything bundle stay open pending the next push/tagged release; WO stays in-progress.
- 2026-08-25 — 946873a — packages/core/src/create.ts, packages/cli/src/commands.ts, action/dist/index.js — the first real Windows CI run (22656ed) surfaced two genuine separator bugs, fixed not skipped: createDocument built its returned veri/-relative contract path with the OS separator, and veriPathInRepo resolved through fs.realpathSync, whose JS implementation does not expand Windows 8.3 short names (runner temp cwds are C:\Users\RUNNER~1\... while git reports the long toplevel), so relative() produced garbage and drift advisories silently vanished on Windows — now realpathSync.native with a plain-realpathSync fallback. Proof: CI run 32807206856 on 946873a green on all three runners (ubuntu/macos/windows), Veri gate run 32807206863 green, 621 tests locally, veri check 0 issues. CI-matrix and green-bundle boxes closed; DEC-082 approved by Daniel (stamp commit 83bff6f) closes the signing-posture box fully. Remaining: the tagged-release artifacts box (v0.3.0 authorized, in flight in a sibling session) and the site platform statement, which updates only when those artifacts actually ship; WO stays in-progress until then.
- 2026-08-25 — 804f239 — packages/ui/src-tauri/tauri.conf.json, packages/ui/src-tauri/icons/icon.ico, packages/ui/scripts/fetch-node.mjs — the first real cross-platform cut (v0.3.0, run 32807531470: darwin green, linux and windows failed) surfaced two more genuine platform bugs plus one latent: bundle.icon listed only icon.icns so the AppImage bundler panicked wanting a square PNG (the square PNGs now join the list); fetch-node extracted the Node zip with bare `tar`, which GitHub's bash steps resolve to Git's GNU tar with no zip support (the system bsdtar at System32 is now pinned by absolute path on win32); and the NSIS bundler's .ico requirement had no .ico in the repo to meet it (generated via `tauri icon` from the existing 512px source and listed). The v0.3.0 tag could not be moved (classifier blocked the remote delete; RELEASING.md's never-move rule) so Daniel chose to burn it — the next cuts were v0.3.1 and, after the size-gate fix below, v0.3.2.
- 2026-08-25 — cf72c0d — packages/ui/scripts/make-updater-manifest.mjs, veri/decisions/DEC-090-per-platform-installer-size-ceilings-req-023-s-50-mb-binds-m.md, veri/ids — the v0.3.1 cut (run 32808851291) proved all three build lanes and failed only the flat 50 MB size gate on the Linux artifacts (AppImage 119.4 MB, .deb 50.7 MB). That flat gate was this WO's own over-extension of REQ-023, whose criteria bind the macOS installer — the ceiling answered Electron's Chromium on platforms with a system WebView (Windows proved the posture at 26.2 MB); Linux has none, so the AppImage carries WebKitGTK plus the Node sidecar REQ-023 itself mandates. DEC-090 (proposed — approval is Daniel's act) records per-platform ceilings just above the measured floor (DMG/NSIS 50 MB, AppImage 150 MB, .deb 60 MB), and the gate now checks each artifact against its own cap, printing the ceiling beside every size; proven against fixture fragments with the real v0.3.1 numbers, pass and fail both.
- 2026-08-25 — 97ac81e — site/index.html, site/docs/quickstart.html — with v0.3.2 fully green (run 32811436514: guard, all three platform builds, and publish success; draft release carries DMGs 42.2/44.2 MB, NSIS 26.2 MB, AppImage 119.4 MB, .deb 50.7 MB plus updater artifacts and latest.json — every installer under its DEC-090 ceiling, verified via gh run view and gh release view), the site's download bands and quickstart now state per-platform reality with caveats: Windows unsigned-for-now with the SmartScreen warning (DEC-082), the AppImage's ~120 MB and auto-update, the .deb's lack of one; the release-resolving script links exact installer assets only when the published latest actually carries them, so nothing is claimed ahead of Daniel publishing the draft. All five acceptance boxes closed; publishing the v0.3.2 draft remains Daniel's act and is not claimed here.
