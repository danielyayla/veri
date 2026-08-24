---
id: WO-083
type: work-order
title: "Homepage restructure: cut a third, show the loop instead of narrating it"
status: in-progress
created: 2026-08-24
updated: 2026-08-24
links:
  - id: REQ-012
    rel: implements
  - id: SRC-041
    rel: informed-by
  - id: WO-065
    rel: builds-on
  - id: WO-082
    rel: depends-on
---

## Summary

SRC-041's structural finding: the homepage runs ten bands (~7,600px) and makes the same conceptual argument three times ("The problem", "The loop", "Why not just prompt harder?") before showing product evidence beyond the hero shot. Restructure to six-to-seven bands that show before they explain: merge "The problem" into the comparison band (WO-082's rework dramatizes the problem already), move "Plain files are the architecture" — the strongest trust band — up to slot two or three, drop the redundant cycle caption, and replace at least one concept band with a short demo recording (45–60s GIF or video) of the actual loop: work order → kickoff prompt → agent pulls context package → receipt lands. Also give the flat "Agent-native / MCP" paragraph a visual (the ten tools or the .mcp.json) and name Cursor, Codex CLI, and Gemini CLI alongside Claude Code.

## In scope

- Resequence and merge `site/index.html` bands down to six or seven, preserving existing copy voice and the token/palette system
- Merge "The problem" band into the WO-082 comparison band; delete the `cycle-caption` restatement
- Move the "Local-first / Plain files are the architecture" band into the top three positions
- Produce and embed one demo recording (GIF or short video, light and dark not required — pick the dark app theme) of the real loop against the sample project, with a static fallback image and honest alt text in the established style
- Upgrade the "Agent-native" band with a visual and the four named agents, linking the existing per-agent connect pages
- Hero screenshot: crop or annotate so the context-package panel is legible at rendered size, or swap the asset for a composition that leads with it

## Out of scope

- The comparison band's copy itself (WO-082)
- Install-path and platform messaging (the install-path work order)
- Docs pages, nav IA changes beyond what band-merging forces, and the small-bug polish items recorded in SRC-041 (7-vs-10 tools string, double-active nav state, table semantics)
- Custom domain, analytics, or any build tooling — the site stays hand-authored static (DEC-033)

## Requirements

- [[REQ-012]] — implements
- [[SRC-041]] — informed-by
- [[WO-065]] — builds-on
- [[WO-082]] — depends-on

## Acceptance tests

- [x] Homepage is six or seven bands and at least a third shorter in rendered height than the current ~7,600px at 1060px width — six `section.band` elements; rendered height measured in-browser at 1060px viewport: 5,062px vs 7,865px for the pre-change page served from HEAD (35.6% shorter; also under 5,067px, one third off the nominal 7,600px)
- [x] A visitor sees the loop demonstrated (recording) before the third band of conceptual prose — the five-capture loop GIF (work order → Start agent session → DEC-006 filed proposed → receipt lands → review queue) is the page's first visual, directly under the hero copy and before any band
- [x] "Plain files are the architecture" appears in the top three bands — it is band one
- [x] The agent-native band shows a visual and names Claude Code, Cursor, Codex CLI, and Gemini CLI with working links — `.mcp.json` file-card with the ten real MCP tool names, plus four agent cards linking docs/connect-claude-code.html, connect-cursor.html, connect-codex-cli.html, connect-gemini.html (all curl 200 against a local `python3 -m http.server` from site/)
- [x] The demo media has a reduced-motion-respecting treatment and descriptive alt text; page passes the WO-065 responsive/AA baseline in both themes — `<picture>` swaps a static first-frame PNG under `prefers-reduced-motion: reduce` (zero JS), alt text narrates all five captures; no horizontal scroll at 375px; new elements' contrast computed in both palettes (agent-link sub 5.91:1 dark / 4.95:1 light, tool strip 5.24:1 / 5.09:1, shot-note 5.16:1 / 4.82:1 — all AA), colors token-only

## Receipts

(none yet)
