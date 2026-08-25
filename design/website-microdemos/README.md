# Handoff: Website v2 — interactive micro-demos homepage

## Overview
Full homepage + docs-page design realizing the SRC-041 critique work
orders ([[WO-082]] comparison band, [[WO-083]] restructure, [[WO-084]]
install path), plus three additions proposed by this design: live
micro-demos of the real interface in place of screenshots/recordings,
the app's typefaces adopted site-wide, and simplified nav IA with
open-source texture. Filed as the design source for the corresponding
work orders; see the SRC document in `veri/sources/` for rationale and
scope boundaries.

## About the design files
Authored as Design Components (`.dc.html`) for the Claude Design canvas;
the published, clickable canvas lives at
<https://claude.ai/code/artifact/679c0f68-7274-45b7-94cb-6892c740a72a>.
The markup + inline styles are the target treatment; the `<x-dc>` /
`sc-if` / `sc-for` / `{{hole}}` scaffolding is canvas plumbing, not part
of the shipped site (the shipped site stays hand-authored static per
DEC-033 — small inline vanilla JS only).

- `Main.dc.html` — the homepage: nav, hero with install command, the
  mini-app demo (tab switching, agent session, approval), and all seven
  bands through the final CTA and footer. Both palettes ride the
  `.th-dark` / `.th-light` token blocks, ported 1:1 from `site/site.css`
  and `packages/ui/renderer/styles.css`.
- `Docs.dc.html` — the quickstart docs page in the same chrome,
  demonstrating site/docs coherence and code-block copy buttons.
- `canvas.json` — artboard layout plus the design-rationale sticky
  notes (band structure, install-command caveat, typography opinion).

## Measurements that matter
- Page width 1160, content wrap 1064 (site's 1060 + padding), reader
  column unchanged.
- Mini app window: ~0.85 scale of the real app — topbar 38px,
  sidebar 172px, tab strip 33px, right panel 296px, pkg rows 6px/10px
  padding, all colors by token name from the app sheet.
- Site type: Source Sans 3 (400/600/700) + JetBrains Mono
  (400/500/600/700) — the app's own faces; must be self-hosted on the
  real site (no third-party fetch), mirroring `packages/ui/renderer/fonts.css`.
- Type ramp kept from site.css: 12/14/16/18/21/28 + clamped display.

## Honest placeholders
- `npm install -g @verikb/cli` is the *treatment* for the hero command;
  the actual form waits on WO-081's distribution decision and must not
  ship before it works verbatim on a clean machine.
- GitHub/docs links in the artboards are `#` stubs.
