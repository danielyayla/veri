---
id: DEC-029
type: decision
title: "GitHub Releases of the public veri repo is the update feed"
status: active
approved: 2026-08-17
created: 2026-08-17
updated: 2026-08-17
links:
  - id: WO-028
    rel: constrains
  - id: DEC-028
    rel: extends
---

## Choice

Release artifacts and electron-updater metadata publish to GitHub Releases on danielyayla/veri (publish.provider: github in electron-builder.yml). The installed app polls that release feed; CI publishes to it with the workflow's built-in GITHUB_TOKEN. The repo is public, so installed apps need no credentials to check or download.

## Rejected alternatives

- **Object-storage bucket (S3/R2)** — equally static and private-repo-proof, but adds an account, credentials, and a billing surface now for a portability benefit only needed if the repo goes private.
- **A public releases-only mirror repo** — decouples the feed from source visibility, but doubles the release surface (two repos to keep consistent) to solve a problem that doesn't exist while veri is public.
- **update.electronjs.org** — rejected in DEC-028; as a feed it also strips the differential-download capability.

## Rationale

The repo is already public and GitHub Releases is a static file host electron-updater speaks natively — zero standing infrastructure, zero credentials in the installed app, and publishing rides the same GitHub permissions the repo already has. Differential updates work because the blockmaps sit next to the artifacts. The single caveat: if the repo ever goes private, installed apps lose the feed — the decision must be revisited then (a public releases-only repo or an object-storage bucket are the one-line-config escape hatches).
