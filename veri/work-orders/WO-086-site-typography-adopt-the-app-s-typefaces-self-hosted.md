---
id: WO-086
type: work-order
title: "Site typography: adopt the app's typefaces, self-hosted"
status: backlog
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

- [ ] The site loads zero third-party resources — fonts served from `site/assets/`, verified in the network panel
- [ ] Homepage and every docs page render with Source Sans 3 / JetBrains Mono in both palettes with no layout breakage at 375px, 768px, and 1060px
- [ ] Total added font weight is under ~400 KB (subset if needed) and text renders with fallback metrics before swap without visible reflow jumps

## Receipts

(none yet)
