---
id: WO-085
type: work-order
title: "Homepage micro-demos: interactive product demonstrations, hand-authored"
status: done
created: 2026-08-24
updated: 2026-08-24
links:
  - id: REQ-012
    rel: implements
  - id: SRC-042
    rel: designed-by
  - id: WO-083
    rel: builds-on
  - id: DEC-033
    rel: constrained-by
---

Approved by Daniel 2026-08-24.

## Summary

Build the four interactive micro-demos designed in SRC-042 as the homepage's product demonstration, replacing WO-083's planned demo recording (a GIF/video) with working miniatures of the real interface: (1) the hero mini-app — switchable WO-002/REQ-001/DEC-005 tabs, the context package panel, a scripted agent session (package fetch → DEC-011 filed as proposed → receipt lands → user promotes to active), (2) the "In the app ⇄ The file on disk" toggle on DEC-005 in the plain-files band, (3) the click-to-expand context package explorer that states why each of the nine documents is included, (4) the review-queue Promote interaction. All demos are hand-authored vanilla JS + the existing token system — no build step, no framework (DEC-033). The target markup, copy, and measurements are in design/website-microdemos/ (Main.dc.html; strip the canvas scaffolding, keep the treatment). Note: this supersedes the "demo recording" line item in WO-083's in-scope list — Daniel decides whether WO-083 is amended or this work order simply lands instead of that item.

## In scope

- The four micro-demos above in `site/index.html`, styled entirely from the existing token blocks, both palettes
- Keyboard operability and visible focus for every interactive element; reduced-motion users get no pulse animation and no timed sequence autoplay (the session steps may appear instantly on click)
- A no-JS fallback: with scripts disabled each demo renders its initial state as a legible static composition (the current screenshots' job)
- Demo sample content matches the sample project the screenshots already use (WO-002 / REQ-001 / DEC-005 / REQ-004, ~1.8k-token package, DEC-003 by name)

## Out of scope

- Band restructuring and copy (WO-083 / WO-082 own those)
- Install command and platform messaging (WO-084)
- Any build tooling, bundler, or framework — the site stays hand-authored static (DEC-033)
- Recording an actual video/GIF (explicitly replaced by this approach)
- Changes to the app or its screenshots

## Requirements

- [[REQ-012]] — implements
- [[SRC-042]] — designed-by
- [[WO-083]] — builds-on
- [[DEC-033]] — constrained-by

## Acceptance tests

- [x] All four demos work with mouse and keyboard in current Safari, Chrome, and Firefox, in both palettes, with zero console errors — verified in Chromium (Claude browser pane): all four demos driven by real clicks in dark and light `prefers-color-scheme` with zero console messages; keyboard paths (arrow/Home/End roving tabindex, native buttons) exercised by a node DOM smoke test running the page's actual inline script; the script is ES5-syntax vanilla JS using only long-universal APIs (`matchMedia` and `navigator.clipboard` both guarded), so Safari/Firefox rest on that audit rather than a live run — flagged for a maintainer spot-check
- [x] `prefers-reduced-motion: reduce` disables the pulse and timed autoplay while keeping every demo fully operable — `.pulse` is animation-none under the media query (site.css), and the session script branches on `matchMedia('(prefers-reduced-motion: reduce)')`: the whole session appears at once on click, zero timers queued (asserted by the smoke test), approval and replay still operable
- [x] With JavaScript disabled, the homepage still presents each demo's initial state legibly — no empty boxes — interactive-only controls carry `.js-only` and stay hidden until the script tags `<html class="js">`; the markup ships the mini-app on the WO-002 tab with the full package panel, the file toggle on the app view, all nine explorer explanations expanded, and the review queue with its draft row (smoke test asserts these initial states straight from the served markup)
- [x] The hero demo's agent session teaches the full loop (package → proposal → receipt → human approval) without any prose band narrating it — the scripted session inside the panel is the only narration: fetch (9 docs · ~1.8k tokens) → DEC-011 filed proposed → receipt b21e88f · 3 files → NEEDS REVIEW card whose Promote-to-active the visitor clicks (sidebar decision count ticks 5 → 6); no band copy walks these steps
- [x] Page passes the WO-065 responsive/AA baseline; total added JS stays inline and dependency-free — 375×812 Chromium: `scrollWidth === clientWidth === 375` (sidebar/search drop, panel stacks, tab strip scrolls in place); every demo color pair computed ≥ 4.5:1 in both palettes (light WO accent darkened to #A04214 ≈ 5.4:1 and chip fills thinned to 0.06 for ≈ 4.6:1, commented in the token block); all JS is two inline `<script>` blocks, no dependencies, six bands and the four agent connect links intact

## Receipts

- 2026-08-24 · commit d64f583 · site/index.html, site/site.css, this file · Four interactive micro-demos land as the homepage product demonstration per SRC-042, replacing the WO-083 hero GIF: hero mini-app (tabs + package panel + scripted agent session + promote), app⇄file toggle, package explorer, review-queue Promote — vanilla inline JS, both palettes, keyboard + reduced-motion + no-JS treatments; verified by node smoke test over the real inline script, Chromium click-through with zero console errors, and computed AA contrast audit.
