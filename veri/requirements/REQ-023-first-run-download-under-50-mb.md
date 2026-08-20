---
id: REQ-023
type: requirement
title: First-run download under 50 MB
status: accepted
approved: 2026-08-20
created: 2026-08-21
updated: 2026-08-20
links:
  - id: SRC-037
    rel: informed-by
  - id: DEC-008
    rel: constrains
---

The first user to download Veri complained about the size of the
download (reported by Daniel, 2026-08-21). Today's artifact is a
194 MB universal DMG; the installed app is 276 MB (arm64 slice) —
almost all of it Electron's bundled Chromium, not Veri.

Download size is a first-impression cost paid by every prospective
user before the product has shown anything. For a local, single-window
tool whose own code is under 2 MB, a ~200 MB download reads as bloat
and contradicts the product's lightweight, files-are-the-source-of-
truth posture.

The 50 MB ceiling is a deliberate choice ([[SRC-037]] framed it): it
is comfortably achievable by a Tauri 2 shell that bundles its own
Node runtime (~40 MB download measured basis), so it does **not**
force the app to depend on the user's system Node — agent features
already require one ([[DEC-031]]), but browsing a knowledge base must
not. Electron cannot meet this number: its framework floor is roughly
100 MB per architecture, so this requirement, if accepted, obsoletes
[[DEC-008]]'s shell choice.

## Acceptance criteria

- [ ] The macOS installer artifact a new user downloads (DMG or zip,
      per architecture) is under 50 MB.
- [ ] The app installed from that artifact opens a project and reads,
      edits, and saves documents with no runtime the artifact did not
      itself provide.
- [ ] Release tooling states the artifact size per release, so a
      regression past 50 MB is visible at cut time, not from user
      complaints.
