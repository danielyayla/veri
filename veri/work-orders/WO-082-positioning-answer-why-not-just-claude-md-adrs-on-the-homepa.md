---
id: WO-082
type: work-order
title: "Positioning: answer \"why not just CLAUDE.md / ADRs?\" on the homepage"
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
---

## Summary

The highest-leverage finding in SRC-041: the site's "Why not just prompt harder?" band argues against manual context re-pasting, which no target developer does anymore — the real incumbent is an AGENTS.md/CLAUDE.md file plus maybe an ADR folder, and the site never says what Veri adds over that. Replace or augment the band with an honest, named comparison: you already have CLAUDE.md and decision records; Veri adds scoped per-task retrieval instead of one growing file, typed links with `veri check` linting, the human approval gate, and commit-provenanced receipts. Positioning against ADRs lands instantly because the audience already trusts that pattern.

## In scope

- Rework the "Context, not prompt engineering / Why not just prompt harder?" band in `site/index.html` to name CLAUDE.md/AGENTS.md and ADRs explicitly and state the four differentiators (scoped retrieval, links + linting, approval gate, receipts)
- Keep or adapt the with/without card layout if it serves the new argument; the existing copy voice and visual system are the constraint, not the target
- A short FAQ-style treatment is acceptable instead of a comparison band if it reads better — one of the two, not both
- Reflect the same positioning in the README's pitch paragraph if it repeats the strawman

## Out of scope

- Any restructuring of other homepage bands (that is the homepage-restructure work order)
- Feature comparisons against commercial tools (Notion, Linear, etc.)
- New screenshots or demo media

## Requirements

- [[REQ-012]] — implements
- [[SRC-041]] — informed-by
- [[WO-065]] — builds-on

## Acceptance tests

- [ ] The homepage names CLAUDE.md/AGENTS.md and ADRs and states what Veri adds over them, in the site's existing voice
- [ ] The "explain the project / paste the requirements" strawman framing is gone
- [ ] A developer who already keeps an AGENTS.md can quote back Veri's four differentiators after reading one band
- [ ] Light and dark renderings both pass the existing AA contrast baseline from WO-065

## Receipts

(none yet)
