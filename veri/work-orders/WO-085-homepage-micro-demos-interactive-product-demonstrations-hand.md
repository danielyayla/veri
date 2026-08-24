---
id: WO-085
type: work-order
title: "Homepage micro-demos: interactive product demonstrations, hand-authored"
status: backlog
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

- [ ] All four demos work with mouse and keyboard in current Safari, Chrome, and Firefox, in both palettes, with zero console errors
- [ ] `prefers-reduced-motion: reduce` disables the pulse and timed autoplay while keeping every demo fully operable
- [ ] With JavaScript disabled, the homepage still presents each demo's initial state legibly — no empty boxes
- [ ] The hero demo's agent session teaches the full loop (package → proposal → receipt → human approval) without any prose band narrating it
- [ ] Page passes the WO-065 responsive/AA baseline; total added JS stays inline and dependency-free

## Receipts

(none yet)
