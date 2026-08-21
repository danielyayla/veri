---
id: DEC-065
type: decision
title: "tauri-plugin-updater on a latest.json GitHub Releases feed; full-archive updates accepted"
status: active
approved: 2026-08-21
created: 2026-08-21
updated: 2026-08-21
links:
  - id: WO-073
    rel: constrains
  - id: DEC-063
    rel: refines
  - id: DEC-029
    rel: builds-on
  - id: DEC-028
    rel: supersedes
---

## Choice

Auto-update ships on tauri-plugin-updater against the existing public GitHub Releases feed (DEC-029 stands): the endpoint is releases/latest/download/latest.json, assembled at release time by packages/ui/scripts/make-updater-manifest.mjs from the per-architecture bundles, with platform entries darwin-aarch64 and darwin-x86_64 pointing at per-arch Veri_<v>_<arch>.app.tar.gz archives. Update archives are minisign-signed: the keypair came from `tauri signer generate`; the public key is committed in tauri.conf.json, the private key lives outside the repo (locally ~/.tauri/veri-updater.key, in CI the TAURI_SIGNING_PRIVATE_KEY secret — never committed). REQ-011 semantics carry over exactly: check 10s after launch and every 4 hours, download and stage silently, ask "Restart Now / Later" once per version and never force — tauri's install replaces the .app on disk immediately while the running app continues, so "Later" is install-on-quit by construction. Failed checks stay invisible in the UI and go to ~/Library/Logs/Veri/main.log through the sidecar's log method (one log, one writer, DEC-034). The check loop and dialogs are Rust glue (~90 lines) because the updater plugin is Rust-only; this is a deliberate, bounded exception at the DEC-001 boundary — no product logic lives in it. Updates are full-archive downloads: electron-updater's differential blockmaps have no tauri equivalent, and the loss is accepted because the whole artifact (~43 MB) now costs less than a typical Electron differential against the old 196 MB baseline.

## Rejected alternatives

- **Keep electron-updater somehow** — it is Squirrel.Mac; it cannot install a Tauri bundle at all. Not an option, only the reason the DEC-064 bridge exists.
- **Custom update server for differential updates** — standing infrastructure to recover a bandwidth optimization the smaller artifacts made mostly moot; rejected for the same reasons as in DEC-028/DEC-029.
- **No auto-update (manual downloads)** — regresses REQ-011 outright.
- **Password-protecting the minisign key with a strong passphrase held only locally** — CI must sign every release, so the passphrase would live in a CI secret next to the key anyway; two secrets that unlock together are one secret with extra steps. The key is generated passwordless and treated as a pure CI secret.

## Rationale

This is the only supported update path for a Tauri app against static hosting, and it preserves everything REQ-011 promised — automatic, consensual, trustworthy (Apple signing plus a second minisign signature the app verifies before install), cheap (static feed, no infrastructure), failure-tolerant (silent degradation, log-only visibility). The per-release manifest script doubles as the REQ-023 regression gate: it fails any release whose DMG crosses 50 MB and writes the sizes into the release notes.
