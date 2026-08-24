---
id: WO-083
type: work-order
title: "Homepage restructure: cut a third, show the loop instead of narrating it"
status: backlog
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

- [ ] Homepage is six or seven bands and at least a third shorter in rendered height than the current ~7,600px at 1060px width
- [ ] A visitor sees the loop demonstrated (recording) before the third band of conceptual prose
- [ ] "Plain files are the architecture" appears in the top three bands
- [ ] The agent-native band shows a visual and names Claude Code, Cursor, Codex CLI, and Gemini CLI with working links
- [ ] The demo media has a reduced-motion-respecting treatment and descriptive alt text; page passes the WO-065 responsive/AA baseline in both themes

## Receipts

(none yet)
