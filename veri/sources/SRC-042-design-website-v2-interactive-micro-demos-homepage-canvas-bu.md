---
id: SRC-042
type: source
title: "Design — Website v2: interactive micro-demos homepage (canvas + bundle, 2026-08-24)"
status: imported
created: 2026-08-24
updated: 2026-08-24
links:
  - id: REQ-012
    rel: builds-on
  - id: SRC-041
    rel: builds-on
  - id: SRC-035
    rel: builds-on
  - id: DEC-033
    rel: constrained-by
  - id: WO-082
    rel: designs
  - id: WO-083
    rel: designs
  - id: WO-084
    rel: designs
---

Design source for the website redesign realizing the [[SRC-041]] critique work orders. Produced 2026-08-24 with Claude Design. Reviewed and approved by Daniel 2026-08-24.

## Artifacts

- Design bundle (canon, in-repo): `design/website-microdemos/` — `README.md` (handoff: measurements, placeholders), `Main.dc.html` (homepage), `Docs.dc.html` (quickstart page), `canvas.json` (layout + rationale notes).
- Clickable canvas: <https://claude.ai/code/artifact/679c0f68-7274-45b7-94cb-6892c740a72a> — the micro-demos are working there: tab switching, the agent-session sequence, the approval gate, the app/file toggle, the package explorer, the review-queue promote.
- Tokens and anatomy lifted 1:1 from `site/site.css` and `packages/ui/renderer/styles.css` (both palettes; nothing invented).

## What it realizes (existing scope)

- [[WO-083]] restructure: ten bands down to hero + seven — hero (with demo), plain files (slot two), the CLAUDE.md/ADR comparison (absorbs "The problem"), scoped context, approval+receipts merged, agent-native (with `.mcp.json` visual and the four named agents plus the ten real tool names), quickstart, fin. The three concept bands ("The problem", "The loop", "Why not just prompt harder?") and the cycle caption are gone.
- [[WO-082]] positioning: the comparison band names CLAUDE.md/AGENTS.md and ADRs and states the four differentiators (scoped retrieval; typed links + `veri check`; approval gate; receipts). The re-pasting strawman is removed.
- [[WO-084]] install path: copyable hero command with copy affordance, DMG demoted to secondary, the non-Mac sentence in the hero sub-line and again in the quickstart band. Command form is a placeholder pending [[WO-081]]'s distribution DEC — must not ship before it works verbatim.

## What it proposes beyond existing scope (each a work order)

1. **Interactive micro-demos instead of a demo recording.** WO-083's in-scope demo recording is replaced by four hand-authored interactive demos of the real interface: (a) the hero mini-app — WO/REQ/DEC tabs, context package panel, a scripted agent session (package fetch → DEC filed proposed → receipt lands → promote to active); (b) an "In the app ⇄ The file on disk" toggle on DEC-005 in the plain-files band; (c) a click-to-expand context package that states why each of the nine documents is included; (d) a review-queue Promote interaction. Rationale: the loop is experienced, not narrated; feasible without a build step (DEC-033) as vanilla JS + tokens.
2. **Site adopts the app's typefaces.** Source Sans 3 + JetBrains Mono site-wide (self-hosted woff2 mirroring `packages/ui/renderer/fonts.css` — no third-party fetch), so product, site, and docs read as one artifact and the site stops looking like a system-font template.
3. **Chrome polish.** Nav IA reduced to Docs · GitHub · Download ("Product" anchor and top-level "Workflow" dropped); open-source texture in the fin band (Apache-2.0, star, browse the sample knowledge base, changelog); copy buttons on docs code blocks; fixes the double-active nav state on `site/docs/workflow.html`.

## Sample content used in the demos

Consistent with the shipped screenshots' alt text: WO-002 "PDF export pipeline" (in-progress), REQ-001 "Branded PDF invoices" (approved), DEC-005 "Typst for PDF rendering" (active, supersedes DEC-003), the nine-document ~1.8k-token package with DEC-003 riding by name as already rejected, REQ-004 "Import time entries from CSV" as the review-queue draft, receipt commit b21e88f. Verified against the real surface: `veri init --demo` (CLI), the ten MCP tool names, `.mcp.json` shape from the connect-claude-code docs page.

## What must not regress (carried from SRC-041)

Copy voice, two-token-block palette discipline, AA contrast in both palettes, descriptive alt text, reduced-motion treatment for the demos, and the no-build hand-authored site architecture (DEC-033).
