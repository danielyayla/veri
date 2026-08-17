---
id: DEC-033
type: decision
title: "GitHub Pages serves the hand-authored static site from site/"
status: proposed
created: 2026-08-17
updated: 2026-08-17
links:
  - id: WO-029
    rel: constrains
  - id: REQ-012
    rel: implements
  - id: DEC-029
    rel: extends
---

## Choice

The website is hand-authored static HTML/CSS committed under `site/`
— no generator, no build step, no runtime dependency — and served by
GitHub Pages of the public veri repo, deployed by a GitHub Actions
workflow (`actions/upload-pages-artifact` + `actions/deploy-pages`)
on pushes to `main` that touch `site/`. The site lives at
`https://danielyayla.github.io/veri/` until a domain clears (a user
task flagged in [[SRC-012]]); a custom domain later is a CNAME plus
one repo setting, with docs paths unchanged. Docs URLs are the
stable contract: `/docs/<page>.html`, one page per topic, never
reorganized without redirects.

The download action needs no per-release edit: release asset names
embed the version (`Veri-0.1.3-universal.dmg`), so the button
resolves the current DMG client-side from the GitHub releases API
(`/repos/danielyayla/veri/releases/latest`, CORS-enabled,
unauthenticated) and falls back to the plain
`github.com/danielyayla/veri/releases/latest` page when JS is
unavailable or the API call fails.

## Rejected alternatives

- **Docs-site generator (VitePress, Docusaurus, Astro)** — a build
  toolchain, theme surface, and dependency-update treadmill for
  roughly eight pages. The repo already hand-authors HTML where it
  matters (the `design/` bundles); the site can hold the same bar
  without a framework.
- **External static host (Netlify, Vercel, Cloudflare Pages)** — an
  account, credentials, and a standing third-party service between
  users and the docs, against [[DEC-029]]'s zero-infrastructure
  posture. GitHub Pages rides the repo permissions that already
  publish releases.
- **Classic `gh-pages` branch (with or without Jekyll)** — commits
  generated output to a second branch that drifts from `main`, or
  adds a Ruby toolchain. The Actions deploy keeps the site source
  as the only committed artifact.
- **Hardcoded versioned download URL** — `releases/latest/download/
  <asset>` requires an exact asset name, and asset names embed the
  version, so every release would need a site edit — exactly what
  [[WO-029]] forbids.

## Rationale

Zero standing infrastructure is the posture [[DEC-029]] set for the
update feed; the site holds the same line. Everything a visitor
receives is a file in this repo: reviewable in diffs, versioned
with the code it documents, deployed by the same Actions permissions
that publish releases. The one dynamic fact a static site cannot
know — the current version's asset name — comes from the same
GitHub Releases source of truth the app's updater already trusts,
with a no-JS fallback that can never go stale.
