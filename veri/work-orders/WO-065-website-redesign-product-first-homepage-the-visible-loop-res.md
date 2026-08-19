---
id: WO-065
type: work-order
title: "Website redesign — product-first homepage, the visible loop, responsive/AA baseline"
status: in-progress
created: 2026-08-19
updated: 2026-08-19
links:
  - id: REQ-012
    rel: implements
  - id: DEC-033
    rel: depends-on
  - id: WO-029
    rel: informed-by
  - id: WO-063
    rel: informed-by
  - id: WO-060
    rel: informed-by
  - id: SRC-035
    rel: designed-by
---

## Summary

Redesign the public site (site/) into a best-in-class developer-tool website per the 2026-08-19 design brief and critique. The current homepage has the right voice and palette but is an understated docs landing page: the product is invisible until mid-page, the loop is three linear steps instead of the six-stage cycle, and the strongest concepts (scoped context, decisions that stay decided, approval, receipts, veri check) are compressed into two generic card grids. The site also has no responsive rules at all (at 375px the header nav forces a 595px-wide page), no light mode, `--faint` text at ~3.6:1 contrast, no favicon, and no OpenGraph metadata. Positioning to preserve and sharpen: Veri is a local-first knowledge base for coding agents — prompts are temporary, project knowledge should accumulate. [[DEC-033]] stands in full: hand-authored static HTML/CSS, no build step, GitHub Pages deploy, stable /docs/<page>.html URLs, JS-resolved download button with no-JS fallback. Existing copy voice ("agents stop re-opening what you settled in March", "git diff shows every word") should largely survive.

## In scope

- Restage the hero: value proposition as the h1 (wordmark stays in the header), a legible product screenshot (work-order/context-package view) visible immediately, Download for macOS as primary CTA, View on GitHub as secondary, and an obvious Quickstart route — not 13px mono fine print
- Homepage narrative per the brief, in order: hero → the problem (agents forget what the project already knows; no exaggerated AI language) → the loop as an actual visual cycle with all six stages including knowledge returning and future sessions starting smarter → context package section (real UI, token estimates, links-not-repo-dump) → decisions that stay decided (show a real decision document with rejected alternatives) → agents propose / humans approve (NEEDS REVIEW crop) → plain files are the architecture (UI ↔ Markdown ↔ Git ↔ agent on the same knowledge) → receipts and auditability → works with your coding agent via MCP (why it matters; config details stay in docs) → final download CTA
- A without-Veri vs with-Veri comparison that reads visually, not as paragraphs
- Cropped, legible product captures per section (context package panel, NEEDS REVIEW queue, a decision doc, agent activity/receipts, health/veri check) shot via the VERI_UI_SHOT harness; at most one full-app screenshot
- Introduce `veri check` on the homepage as a linter/compiler for project intent, with concrete example findings (broken links, work orders without requirements, completed work without receipts)
- Responsive baseline for every page: media queries, nav collapse/wrap, clamp() display type, wrappable inline code; no horizontal scroll at 375px
- Accessibility floor: all text at WCAG AA contrast (fix --faint usage), nav touch targets, skip-to-content link, prefers-reduced-motion honored by any loop animation
- Light mode via prefers-color-scheme, porting the app's light palette (post-WO-060) so screenshots and site can share a theme story
- Favicon and OpenGraph/Twitter metadata with a product image
- Nav IA per the brief: Product / Workflow / Docs / GitHub / [Download]; Troubleshooting demoted into docs navigation; shared header/footer updated across docs pages
- CSS hygiene while in there: consolidate the type scale, replace nonstandard 640/650 font weights, remove the dead duplicate background in .callout

## Out of scope

- Any site generator, framework, build step, or external host — [[DEC-033]] is settled
- Moving or renaming docs URLs; /docs/<page>.html paths are a stable contract (redirects only if a page must move, which this work should avoid)
- Rewriting docs page content beyond the shared header/footer/stylesheet and nav labels (docs freshness is separate work; see WO-063)
- Custom domain work
- Analytics, telemetry, cookie banners, or any network access beyond the existing releases-API version check
- Video or screen-recording production; the loop is communicated with HTML/CSS/SVG and screenshots
- Inventing capabilities the shipped app does not have; every claim must match the current release
- Changes to the app itself, the MCP server, or the deploy workflow (site.yml)

## Requirements

- [[REQ-012]] — implements
- [[DEC-033]] — depends-on
- [[WO-029]] — informed-by
- [[WO-063]] — informed-by
- [[WO-060]] — informed-by

## Acceptance tests

- [x] A stranger scrolling the homepage for 60 seconds can answer: what Veri is, why they'd use it, and how it differs from prompting harder — with the six-stage loop and the context package shown as product UI, not prose
- [x] The hero shows the product and offers Download, GitHub, and Quickstart without scrolling at 1280×800
- [x] Homepage sections cover: problem, loop (all six stages, visually cyclic), context package, decision document with rejected alternatives, NEEDS REVIEW approval queue, plain-files architecture, receipts, MCP connection, final CTA
- [x] No page scrolls horizontally at 375px wide, and the nav remains usable
- [x] All text passes WCAG AA contrast in both dark and light themes; light mode follows prefers-color-scheme; animations honor prefers-reduced-motion
- [x] Every product screenshot is legible at its rendered size (no full-app capture squeezed under 1000px except at most one establishing shot)
- [ ] Favicon and og: metadata present; a shared link preview renders title, description, and product image
- [x] Docs URLs are unchanged, the download button still resolves the latest DMG client-side with the no-JS fallback, and the site remains hand-authored HTML/CSS deployed by the existing Pages workflow
- [x] veri check reports zero issues

## Receipts

- 2026-08-19 · 9745d2f · site/index.html, site/site.css, site/docs/*.html, site/assets/* (16 new assets, 2 removed), veri/sources/SRC-035, veri/ids — full homepage redesign per SRC-035: product-first hero, six-stage visual loop, with/without comparison, context package / decision / NEEDS REVIEW / plain-files / receipts / veri check / MCP sections, final CTA; responsive baseline (no horizontal scroll at 375px, verified), AA contrast audited numerically in both themes, light mode via prefers-color-scheme with theme-matched screenshots reshot through VERI_UI_SHOT, skip links, favicon set (SVG + PNG + apple-touch), OpenGraph meta, docs sub-nav strip. Remaining box: the shared-link preview can only be verified after the Pages deploy (push to main).
