---
id: DEC-057
type: decision
title: "Site light mode via prefers-color-scheme, not the app's data-theme mechanism"
status: active
approved: 2026-08-19
created: 2026-08-19
updated: 2026-08-19
links:
  - id: WO-065
    rel: constrains
  - id: DEC-055
    rel: consistent-with
  - id: DEC-033
    rel: consistent-with
---

## Choice

The website's light mode is implemented entirely in CSS: `:root` holds the dark tokens (the default), and a single `@media (prefers-color-scheme: light)` block overrides them with the light palette ported from the app's token layer (packages/ui/renderer/styles.css, post-WO-060). Screenshots follow the same signal — every product image is a `<picture>` whose `<source media="(prefers-color-scheme: light)">` serves the light-theme capture, with the dark capture as the `<img>` fallback. There is no theme toggle, no JavaScript, no persisted preference, and no `data-theme` attribute on the site; the visitor's OS setting is the only input.

## Rejected alternatives

- **The app's mechanism ([[DEC-055]]): a `data-theme` attribute plus a stored preference** — DEC-055 rejected media queries for the app because a `system | light | dark` preference needs an explicit override of the OS, which a media query cannot express. The site has no preference UI and stores nothing, so the override case never arises; porting the attribute machinery would mean adding JavaScript, a persistence story (localStorage), and a flash-of-wrong-theme problem to a static page — cost without the capability that justified it.
- **A visitor-facing theme toggle on the site** — a control, script, and stored state on every page to serve a preference the OS already expresses; against the site's no-JS-beyond-the-download-resolver posture ([[DEC-033]]), and a marketing page is not somewhere visitors configure.
- **Dark-only (status quo)** — WO-065 requires the site to share the app's theme story after WO-060 shipped light mode; a dark-only site contradicts the product it advertises and renders poorly for OS-light visitors.
- **Light-first with a dark media block** — either default is technically equivalent, but dark is the brand's established default (the app, all prior site history, the OG image); dark-as-base keeps the no-preference and legacy-browser rendering on brand.

## Rationale

DEC-055's rejection of `prefers-color-scheme` was scoped to a problem the site does not have: expressing an explicit user override of the OS. Where no override exists, the media query is the whole mechanism — zero JavaScript, zero storage, no first-paint flash, and correct behavior for every visitor including scheduled OS auto-switching. Porting the palette values (not the mechanism) from the app's token blocks keeps the two surfaces visually in step while letting each use the simplest machinery its constraints allow; the theme-matched `<picture>` sources extend the same single signal to the screenshots, so app UI shown on the page always matches the page around it.
