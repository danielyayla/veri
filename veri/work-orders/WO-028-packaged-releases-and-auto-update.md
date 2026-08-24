---
id: WO-028
type: work-order
title: Packaged releases and auto-update for the desktop app
status: backlog
created: 2026-08-17
updated: 2026-08-24
links:
  - id: SRC-011
    rel: designed-by
  - id: REQ-011
    rel: implements
  - id: REQ-004
    rel: extends
  - id: DEC-008
    rel: constrained-by
---

## Summary

Veri has installed users but no release pipeline: `packages/ui` runs
only as `electron .` from a checkout — no installer, no signed
binary, no way to ship a fix without a manual reinstall. Deliver the
macOS release path end to end: electron-builder packaging (DMG for
install, ZIP for updates), Developer ID signing + notarization,
electron-updater in the main process checking a static release feed,
and a tag-triggered CI job that builds, signs, and publishes. Updates
download in the background and install on user consent or on quit —
never a forced restart. Differential downloads (blockmaps) keep
frequent small releases cheap for users.

## In scope

- electron-builder configuration in `packages/ui`: appId, DMG + ZIP
  targets (Squirrel.Mac updates require the ZIP), version taken from
  the package manifest, blockmap generation.
- Developer ID signing and notarization wired through environment
  variables / CI secrets; nothing secret committed.
- electron-updater in the main process: check on launch and on an
  interval, background download, then a native dialog offering
  Restart Now / Later; Later installs on next quit. Offline or
  failed checks are silent and non-fatal.
- Publish target: a static release feed (GitHub Releases or an
  object-storage bucket). The concrete choice is a decision to file
  as a proposed DEC during implementation, with alternatives
  (update.electronjs.org, custom server) recorded.
- CI workflow triggered by a version tag: build, sign, notarize,
  publish artifacts plus update metadata (`latest-mac.yml`,
  blockmap).
- Design gate: update UX is native dialogs only, so produce the
  [[DEC-026]] note-style source document and link it `designed-by`
  before implementation starts ([[DEC-012]]).

## Out of scope

- Windows and Linux packaging, signing, and updates (follow-up work
  order).
- A custom update server, staged rollouts, release channels
  (beta/latest), or telemetry.
- Any renderer UI for updates (banners, settings pane) — native OS
  dialogs only.
- Updating `@veri/cli` / `@veri/mcp` outside the bundled app.
- Versioning or migration of the `veri/` knowledge-base format
  across app versions (worth its own requirement; not this WO).

## Requirements

Implements [[REQ-011]] — installable, self-updating desktop app
distribution — scoped here to macOS. Extends [[REQ-004]]: the
desktop UI must reach users as an installable app that stays
current, not a dev checkout.

## Acceptance tests

- [x] A dist script in `packages/ui` produces a signed, notarized
      DMG and ZIP; the DMG installs and launches clean on a Mac that
      never had a dev checkout (Gatekeeper passes, `spctl -a`). —
      verified live on the Electron line by [[WO-034]] (quarantined
      v0.1.4 DMG assessed `accepted / source=Notarized Developer ID`
      by spctl, staple valid, launched with no override); holds today
      on the Tauri line: `dist` script in packages/ui/package.json,
      CI-signed and notarized per-arch DMGs published in v0.2.0/v0.2.1
      ([[WO-073]]). The ZIP (Squirrel.Mac) update artifact became
      minisign-signed `.app.tar.gz` archives per [[DEC-065]].
- [x] With version N installed and N+1 published to the feed,
      relaunching detects the update, downloads it in the
      background, and shows the native prompt; Restart Now relaunches
      into N+1. — verified live by [[WO-034]] (0.1.4→0.1.5 applied
      only on the Restart Now click) and again on the Tauri line by
      [[WO-073]] (installed 0.2.0 found, downloaded, and staged
      0.2.1 from the published feed; relaunch logged "app 0.2.1
      launched"; [[DEC-065]] keeps the Restart Now / Later dialog).
- [x] Choosing Later applies the update on next quit; the running
      session is never force-restarted. — verified live by
      [[WO-034]] (0.1.6→0.1.7 applied on quit with the consent
      dialog untouched); on the Tauri line Later is install-on-quit
      by construction ([[DEC-065]]): 0.2.1 staged on disk while
      0.2.0 kept running ([[WO-073]]).
- [x] Launching with no network (or an unreachable feed) starts
      normally with no error surfaced.
- [x] The N→N+1 download is differential (blockmap hit), not a full
      artifact download. — proven live on the Electron line by
      [[WO-034]] (0.1.5→0.1.6 downloaded differentially, 88,384 KB
      of 202,694 KB = 44%, and 0.1.6→0.1.7 likewise); deliberately
      retired on the Tauri line by approved [[DEC-065]] — full-archive
      updates accepted because the whole ~43 MB artifact costs less
      than a typical differential against the 196 MB Electron
      baseline.
- [x] Pushing a version tag runs CI to a published release with
      update metadata; no manual steps besides the tag. — proven
      live across v0.1.3–v0.1.7 ([[WO-033]]/[[WO-034]] tag flow) and
      on the Tauri line for v0.2.0/v0.2.1 (.github/workflows/
      release.yml: tag → build, sign, notarize, upload artifacts +
      latest.json, verify one complete release). Two deliberate
      deviations from the literal wording, both on the record: CI
      creates a draft the maintainer reviews and publishes
      ([[DEC-032]], after the v0.1.1 duplicate-release race), and
      carrying the Electron-bridge assets forward is a documented
      manual step (RELEASING.md) until 0.1.x installs are extinct
      ([[WO-073]] receipt).
- [x] Packager and feed-host choices are filed as proposed DECs with
      rejected alternatives.
- [x] `veri check` and `npm test` are clean.

## Notes

- 2026-08-21 — Returned to backlog: [[DEC-008]] was superseded by
  [[DEC-063]] (Tauri 2 shell), so this WO's remaining Electron-specific
  boxes (differential updates, signed CI release on the Electron line)
  lost their authority. [[WO-073]] carries the release/updater/signing
  scope forward on the Tauri line, including the bridge for installs
  this WO shipped. Receipts below record the work that did land.

## Resolution

2026-08-24 — Closed done: every substantive goal of this WO holds in
shipped reality, though the delivery path ran Electron → Tauri rather
than staying on the plan above. What this WO built directly (receipts
a982fd4, 076d07f) — electron-builder packaging, electron-updater with
the native Restart Now / Later dialog, the tag-triggered release CI,
[[DEC-028]]/[[DEC-029]] — became the working Electron release line:
[[WO-033]] fixed its duplicate-release race and [[WO-034]] verified
signed, notarized install and consensual auto-update end to end on it
(v0.1.4–v0.1.7), checking every [[REQ-011]] criterion. [[DEC-063]]
then superseded [[DEC-008]] and [[WO-073]] migrated the shell to
Tauri 2, replacing electron-updater with tauri-plugin-updater on the
same GitHub Releases feed ([[DEC-065]], superseding DEC-028) with the
[[DEC-064]] bridge so 0.1.x installs cross over; releases v0.2.0 and
v0.2.1 are live, CI-signed and notarized, and the 0.2.0→0.2.1 update
walk was verified against the published feed. The one capability
proven here and not carried forward — differential blockmap downloads
— was retired by approved [[DEC-065]], not lost by accident. The
acceptance boxes above are checked against that evidence, per box.

## Receipts

- 2026-08-17 — a982fd4 — packages/ui/electron-builder.yml, packages/ui/build/entitlements.mac.plist, packages/ui/src/lib/updater.ts, packages/ui/src/main.ts, packages/ui/package.json, .github/workflows/release.yml, .gitignore, DEC-028, DEC-029, SRC-011 — claude-code session: electron-builder universal DMG+ZIP+blockmaps (asar off for real server.js/demo files), electron-updater with native Restart Now/Later dialog and install-on-quit, tag-triggered sign/notarize/publish CI; local unsigned build verified end-to-end (packaged app renders this project, survives empty feed silently); signing/notarization, real N-to-N+1 update, and CI run boxes await Apple credentials and a first tagged release — status stays in-progress
- 2026-08-17 — 076d07f — workflows/release.yml — First live release run: added unsigned-build fallback when signing secrets are absent, tagged v0.1.1 (version bump and retag in commit 4c45b12, an unprefixed release commit), published release with DMG/zip/latest-mac.yml, verified DMG mounts and app launches
