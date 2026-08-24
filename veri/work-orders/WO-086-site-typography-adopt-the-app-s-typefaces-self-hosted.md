---
id: WO-086
type: work-order
title: "Site typography: adopt the app's typefaces, self-hosted"
status: done
created: 2026-08-24
updated: 2026-08-24
links:
  - id: REQ-012
    rel: implements
  - id: SRC-042
    rel: designed-by
  - id: DEC-033
    rel: constrained-by
---

Approved by Daniel 2026-08-24.

## Summary

Replace the site's system-font stacks with the app's own faces — Source Sans 3 for text, JetBrains Mono for mono — so product, site, and docs read as one artifact (SRC-042's typography opinion). Fonts must be self-hosted woff2 in site/assets/, mirroring the app's packages/ui/renderer/fonts.css subsets and weights (Source Sans 3 400/600/700, JetBrains Mono 400/500/600/700): no Google Fonts fetch, keeping the site's zero-third-party, no-telemetry stance intact. System stacks remain as fallbacks with close metrics.

## In scope

- `@font-face` declarations and woff2 files in `site/assets/`, wired into the `--sans`/`--mono` tokens in `site.css`
- `font-display: swap` and preload for the two above-the-fold faces
- Sweep both homepage and all docs pages for metric shifts (line wrapping, button heights) after the swap

## Out of scope

- Any change to the type ramp, weights, or palette
- App-side font changes (the app already ships these faces)
- A build step or font CDN (DEC-033)

## Requirements

- [[REQ-012]] — implements
- [[SRC-042]] — designed-by
- [[DEC-033]] — constrained-by

## Acceptance tests

- [x] The site loads zero third-party resources — fonts served from `site/assets/`, verified in the network panel
      — Verified 2026-08-24 against a local server: performance resource entries on docs pages list zero
      non-origin requests; the homepage's only non-origin request is the pre-existing GitHub releases API
      call sanctioned by [[DEC-033]]'s download resolver. Fonts curl 200 from `assets/fonts/` with
      `font/woff2`, and the 404 page's absolute `/veri/assets/fonts/` URLs verified 200 under a simulated
      Pages prefix. No `googleapis`/`gstatic`/CDN reference anywhere in `site/`.
- [x] Homepage and every docs page render with Source Sans 3 / JetBrains Mono in both palettes with no layout breakage at 375px, 768px, and 1060px
      — Verified 2026-08-24: `document.fonts` reports both faces `loaded` and active on homepage, docs, and
      404; screenshots at 375/768/1060 in dark and light show the faces applied with the WO-085 hero
      mini-app intact; an automated sweep of all 14 stylesheet-linked pages at 375px and 768px (fonts ready)
      found zero horizontal overflow, and 1060px showed scrollWidth == clientWidth.
- [x] Total added font weight is under ~400 KB (subset if needed) and text renders with fallback metrics before swap without visible reflow jumps
      — 28,792 B (Source Sans 3) + 31,340 B (JetBrains Mono) = ~60 KB total: the app's own variable-weight
      latin subsets, byte-identical (sha256) to `packages/ui/renderer/fonts/`. Both `@font-face` rules use
      `font-display: swap` with the previous close-metric system stacks retained as fallbacks in
      `--sans`/`--mono`, and both faces are preloaded on every page, so the swap window is minimal and
      unstyled text renders on the fallback metrics.

## Receipts

- 2026-08-24 · commit 6ee9587 · site/site.css, site/index.html, site/404.html, site/docs/*.html (13 pages),
  site/assets/fonts/{source-sans-3-latin.woff2, jetbrains-mono-latin.woff2, README.txt},
  veri/work-orders/WO-086-….md — Adopted the app's typefaces site-wide: copied the app's variable-weight
  latin-subset woff2 files (byte-identical to packages/ui/renderer/fonts/), declared them with
  `@font-face` + `font-display: swap` in site.css (inlined on 404.html with absolute /veri/ paths),
  prepended the faces to the `--sans`/`--mono` tokens keeping system stacks as fallbacks, preloaded both
  faces on all pages, bumped the site.css cache-busting query (?v=5→6 homepage, ?v=2→3 docs). License
  check: both faces SIL OFL 1.1 — verified in the embedded name tables (ID 0 copyright, ID 14 license URL)
  and recorded in site/assets/fonts/README.txt; OFL permits self-hosted redistribution with notices
  retained. Session note: took over and audited orphaned in-tree work from an interrupted twin session of
  this same work order before verifying and committing.
