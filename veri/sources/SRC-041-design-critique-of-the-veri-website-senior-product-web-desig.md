---
id: SRC-041
type: source
title: "Design critique of the Veri website (senior product/web designer review, 2026-08-24)"
status: imported
created: 2026-08-24
updated: 2026-08-24
---

Structured design critique of the site in `site/` (homepage + seven docs pages), performed 2026-08-24 against the working tree at commit bd6356b. Method: full visual review of the rendered homepage (dark mode, desktop, local server) plus source review of `site/index.html`, `site/site.css`, and all files in `site/docs/`. Framed for the target visitor: a first-time developer deciding what Veri is, why it matters, and how to start.

## Overall verdict

Well above the median open-source project site: copywriting, token-based design system, and accessibility craft (alt text, skip link, reduced-motion, focus rings, AA contrast in both palettes) are strengths to preserve. The site's weakness is that it over-explains and under-shows, leaves the most predictable developer objection unanswered, and gives non-Mac developers no path.

## Critical findings

1. **The "why not just CLAUDE.md / AGENTS.md / ADRs?" question is never answered.** Experienced developers already keep agent-instruction files and know architecture decision records; they will ask this within the first 30 seconds. The homepage's "Why not just prompt harder?" section (index.html, `#problem`-adjacent band) argues against manual context re-pasting — a 2023 strawman — instead of against the real incumbent practice. Veri's actual differentiators over a docs folder (scoped per-task retrieval, typed links + `veri check` linting, the approval gate, receipts) are never stated as a comparison.

2. **Non-Mac developers hit a dead end.** "macOS 13+" appears only in the small mono `dl-sub` line. No CLI install path, no cross-platform statement, no roadmap note anywhere on the site. Silence reads as "not for you, ever." (CLI distribution itself is [[WO-081]] scope; the site messaging gap is what this source records.)

3. **The homepage makes the same argument three times before showing the product again**: "The problem", "The loop", and "Why not just prompt harder?" are ~three viewport-heights of concept prose between the hero screenshot and the first evidence section. Ten bands, ~7,600px tall. No demo video/GIF exists; the only way to experience the loop is DMG install.

## Moderate findings

- Hero shows a full app window whose key region (context package panel) is an unreadable sliver; the money shot appears correctly cropped only in the later "Scoped context" band.
- No copyable install command in the hero — table stakes for a modern dev tool.
- Top nav IA: "Product" is a mid-page anchor; "Workflow" duplicates a docs page at top level; on `site/docs/workflow.html` lines 20–21 BOTH "Workflow" and "Docs" carry `class="nav here"` (double active state — bug).
- "Plain files are the architecture" (the strongest trust/differentiator band) is buried sixth of ten sections.
- "The loop" snake grid bottom row reads 6-5-4 against left-to-right scanning; the `cycle-caption` below restates the same cycle redundantly.
- "Agent-native / MCP" band is a lone paragraph with no visual, and undersells agent support ("Claude Code today") while docs ship Cursor/Codex/Gemini pages.
- No open-source texture: no stars/license/changelog signals, no link to browse the sample knowledge base on GitHub despite the "renders on GitHub" claim.

## Minor findings

- `site/docs/connect-claude-code.html` line ~71: success message says "16 documents, 7 tools" while the same page's table, the quickstart, and the reference all say ten tools — stale string.
- Docs tables use `display: block` for overflow, stripping table semantics for screen readers; wrap in a scrolling div instead.
- No copy buttons on code blocks; `reference.html` (longest page) has no on-page ToC.
- No manual dark/light toggle (system-only) — acceptable, noted.

## What must not regress

Copy voice ("Decisions that stay decided", "Agents propose. You decide what becomes canon", "Delete Veri and your project knowledge is still a folder of Markdown"); honest docs tone ("the one step Veri can't do for you"); two-token-block palette discipline in `site.css`; descriptive screenshot alt text; no-build, no-telemetry site architecture.

## Top three recommendations (each filed as a work order)

1. Answer the CLAUDE.md/ADR objection head-on with a comparison section.
2. Cut the homepage by a third; show the loop (demo recording) instead of narrating it three times; resequence bands.
3. Surface an install path for everyone: copyable install command in the hero, explicit non-Mac statement.
