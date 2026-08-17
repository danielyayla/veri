---
id: WO-028
type: work-order
title: Packaged releases and auto-update for the desktop app
status: in-progress
created: 2026-08-17
updated: 2026-08-17
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

- [ ] A dist script in `packages/ui` produces a signed, notarized
      DMG and ZIP; the DMG installs and launches clean on a Mac that
      never had a dev checkout (Gatekeeper passes, `spctl -a`).
- [ ] With version N installed and N+1 published to the feed,
      relaunching detects the update, downloads it in the
      background, and shows the native prompt; Restart Now relaunches
      into N+1.
- [ ] Choosing Later applies the update on next quit; the running
      session is never force-restarted.
- [x] Launching with no network (or an unreachable feed) starts
      normally with no error surfaced.
- [ ] The N→N+1 download is differential (blockmap hit), not a full
      artifact download.
- [ ] Pushing a version tag runs CI to a published release with
      update metadata; no manual steps besides the tag.
- [x] Packager and feed-host choices are filed as proposed DECs with
      rejected alternatives.
- [x] `veri check` and `npm test` are clean.

## Receipts

- 2026-08-17 — a982fd4 — packages/ui/electron-builder.yml, packages/ui/build/entitlements.mac.plist, packages/ui/src/lib/updater.ts, packages/ui/src/main.ts, packages/ui/package.json, .github/workflows/release.yml, .gitignore, DEC-028, DEC-029, SRC-011 — claude-code session: electron-builder universal DMG+ZIP+blockmaps (asar off for real server.js/demo files), electron-updater with native Restart Now/Later dialog and install-on-quit, tag-triggered sign/notarize/publish CI; local unsigned build verified end-to-end (packaged app renders this project, survives empty feed silently); signing/notarization, real N-to-N+1 update, and CI run boxes await Apple credentials and a first tagged release — status stays in-progress
- 2026-08-17 — 4c45b12 — .github/workflows/release.yml, packages/ui/package.json, package-lock.json — First live release run: added unsigned-build fallback when signing secrets are absent, tagged v0.1.1, published release with DMG/zip/latest-mac.yml, verified DMG mounts and app launches
