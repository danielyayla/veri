---
id: DEC-090
type: decision
title: "Per-platform installer size ceilings: REQ-023's 50 MB binds macOS and Windows; Linux ships with platform-honest ceilings (AppImage 150 MB, .deb 60 MB)"
status: active
approved: 2026-08-25
created: 2026-08-25
updated: 2026-08-25
links:
  - id: WO-092
    rel: constrains
  - id: REQ-023
    rel: satisfies
  - id: REQ-030
    rel: consistent-with
---

## Choice

The release size gate becomes per-platform: macOS DMGs and the Windows NSIS installer keep REQ-023's 50 MB ceiling; the Linux AppImage is gated at 150 MB and the .deb at 60 MB. Every artifact's size is still stated per release in SIZES.md, and crossing any ceiling still fails the build loudly at cut time.

## Rejected alternatives

- **Shrink the AppImage under 50 MB** — no path exists: WebKitGTK plus the mandatory Node sidecar exceed 50 MB before any Veri code; dropping the sidecar would violate REQ-023's own no-system-Node criterion, and a Tauri app cannot drop WebKitGTK on Linux.
- **Drop the AppImage, ship the .deb only** — loses the distro-agnostic install path and the entire Linux auto-update channel (the AppImage is the updater artifact; the .deb has no update path), narrowing REQ-030.
- **Raise REQ-023's number globally** — throws away a real, achieved bar on the platforms where it is meaningful (42–44 MB DMGs, 26 MB NSIS).
- **State Linux sizes but gate nothing** — loses regression detection exactly where bloat is likeliest; a ceiling at platform physics keeps the loud failure REQ-023's third criterion demands.

## Rationale

REQ-023's acceptance criteria bind the macOS installer: the 50 MB ceiling answered Electron's bundled-Chromium bloat on platforms where the OS provides the WebView. Windows has WebView2, and the first real cut proved the posture there (NSIS 26.2 MB). Linux has no system WebView: the AppImage must carry the WebKitGTK stack, plus the Node sidecar REQ-023 itself mandates bundling — measured 119.4 MB on v0.3.1 (run 32808851291). The .deb defers WebKitGTK to apt dependencies but still carries the sidecar: 50.7 MB. These are platform physics, not regressions; the ceilings are set just above the measured floor so real regressions still fail the release.
