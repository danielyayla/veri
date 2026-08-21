---
id: DEC-064
type: decision
title: "Updater bridge: a final Electron 0.1.8 release walks 0.1.x installs to the Tauri line"
status: proposed
created: 2026-08-21
updated: 2026-08-21
links:
  - id: WO-073
    rel: constrains
  - id: DEC-063
    rel: refines
---

## Choice

The Electron line ends with one final release, 0.1.8, cut from the WO-073 bridge-groundwork commit (5212466) — the last commit where packages/ui is a working Electron app. 0.1.8 adds exactly one behavior: on the existing update-check cadence it also fetches the Tauri feed (latest.json on the same GitHub Releases host), and once that feed exists and names a newer version, it shows a one-time dialog offering a browser download of the new installer (the releases page, so the user picks their architecture's DMG). Existing 0.1.x installs reach 0.1.8 through the unchanged electron-updater path — latest-mac.yml still points at it, install-on-quit intact (WO-031/WO-034 parity) — and 0.1.8 is the Electron line's terminal version: Tauri releases publish latest.json only, never latest-mac.yml, so electron-updater sees nothing newer, and the bridge dialog is the sole forward path. Installing the new DMG replaces Veri.app in place (same bundle path, same io.github.danielyayla.veri identifier); the sidecar keeps Electron's state locations verbatim (~/Library/Application Support/Veri/config, ~/Library/Logs/Veri), so MRU, workspace, and theme survive the crossing, and tauri-plugin-updater owns updates from there. The pure feed-parsing logic (bridgeTarget) is tested; the feed probe is the only network touch, against the host REQ-011 already depends on.

## Rejected alternatives

- **Silent strand (no bridge)** — 0.1.x installs would simply never see an update again; violates REQ-011's promise that the installed app brings itself current, and the user who complained about download size (REQ-023) would never receive the fix.
- **Auto-download and mount the DMG from the Electron app** — Squirrel.Mac cannot install a Tauri bundle, so this would be a half-automated flow: download an artifact electron-updater never validated, mount it, and ask the user to drag-install anyway. More code, scarier failure modes, same one manual step at the end.
- **Publish both feeds indefinitely** — every release doubled (Electron rebuild + Tauri build) with the old line never converging; the Electron framework floor is the very cost REQ-023 exists to shed.
- **Point latest-mac.yml at a fake final version with release notes only** — electron-updater would download and fail to install a non-Squirrel artifact, or install nothing; either way it corrupts the trusted auto-update path instead of ending it cleanly.

## Rationale

Squirrel.Mac and tauri-updater cannot hand off to each other, so some release must be the deliberate last step of the old line — better one purposely-built terminal release that names the crossing than an open-ended feed that quietly stops answering. Detecting the actual Tauri feed (rather than hard-coding a date or version) means the dialog appears exactly when there is something real to download, stays silent forever if the migration slips, and needs no new infrastructure: the same GitHub Releases host, one extra GET. Because the tag builds from the bridge commit with the workflow file as of that commit, the bridge can ship even though Electron is already retired on main — git history is the toolchain archive.
