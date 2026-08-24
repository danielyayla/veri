---
id: DEC-078
type: decision
title: "Loop demo ships as a captioned five-still GIF with a reduced-motion picture fallback"
status: proposed
created: 2026-08-24
updated: 2026-08-24
links:
  - id: WO-083
    rel: constrains
  - id: DEC-066
    rel: consistent-with
  - id: DEC-057
    rel: consistent-with
---

## Choice

The homepage loop demo (WO-083) is an animated GIF assembled from five real VERI_UI_SHOT captures of the app walking one pass of the loop against the `veri init --demo` sample project (dark theme), each frame cropped to the reader + context-package composition with a step caption burned in ("1/5 …" through "5/5 …"), on a ~50 s cycle. A `<picture>` element swaps in the first composed frame as a static PNG under `prefers-reduced-motion: reduce`. Zero JavaScript; the shot-note under the card states it is five captures and names the reduced-motion behavior. The frames are staged by mutating the demo project on disk between headless captures (file DEC-006 as proposed, land the receipt on WO-002), so every state shown is a real render of a real file state.

## Rejected alternatives

- **Real-time screen recording (video or GIF)** — needs the window on screen and the Screen Recording TCC permission, exactly what [[DEC-066]] rejected for stills; output is nondeterministic and expensive to re-produce every time the UI changes.
- **MP4/H.264 in a `<video>` element** — smaller per second, but autoplay gating on reduced motion needs JavaScript (against the site's no-JS-beyond-the-download-resolver posture, [[DEC-057]]), and a click-to-play poster hides the loop from most visitors; the repo also carries no video toolchain.
- **Interactive HTML micro-demos** — the better long-term answer and SRC-042's design, but that is WO-085's deliverable, explicitly not this work order's.
- **Un-captioned frames** — a silent slideshow of five app states is unreadable without narration; burned captions keep the show-then-explain intent without page-side script.

## Rationale

Reuses the deterministic headless capture path DEC-066 established, so the demo is re-shootable from a script whenever the UI changes. Five stills at ~50 s compress to ~600 KB as a GIF — a real recording of the same length is many megabytes. The `picture` + `prefers-reduced-motion` source swap is the same zero-JS media-query idiom DEC-057 uses for the theme, and an `img` carries ordinary alt text, which a `video` cannot. Honesty is preserved by saying "five captures" in the visible caption rather than passing the sequence off as a screen recording.
