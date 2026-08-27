---
id: WO-120
type: work-order
title: "Home tab: surface ready work orders, dedupe the feeds, fix quiet-text contrast"
status: in-progress
claimed_by: claude-wo120-home-critique
claimed_at: 2026-08-27
approved: 2026-08-27
created: 2026-08-27
updated: 2026-08-27
links:
  - id: REQ-004
    rel: implements
  - id: SRC-055
    rel: designed-by
  - id: DEC-111
    rel: constrained-by
  - id: WO-117
    rel: relates-to
binds:
  paths:
    - packages/ui/src/renderer/derive.ts
    - packages/ui/src/renderer/views/home.ts
    - packages/ui/renderer/styles.css
  tests:
    - packages/ui/src/renderer/derive.test.ts
---

## Summary

Implements SRC-055's critique design on the intent home: IN FLIGHT includes ready work orders (the pickable work the card previously hid); RECENTLY CHANGED excludes documents already rendered by another home card, becoming the feed of otherwise-unexplained edits; AGENT ACTIVITY receipt rows carry the work order's title instead of the commit hash; HEALTH's dot follows the clean/issues verdict and its advisory list drops untested-bet entries the CURRENT BETS card already owns; on bets rows the title wraps instead of truncating and a done-WO count renders faint, not green, while the bet is untested; .hv-time and .hv-meta step up from ghost tokens to --faint to clear the WCAG AA contrast floor. No new cards, controls, or state — every change rewords or refilters an existing element (REQ-035's home stays the intent surface; this order deliberately does not link that hypothesis, per SRC-055).

## In scope

- `inFlight` (derive.ts) includes `status: ready` work orders; doc comment updated
- `projectActivity` receipt text becomes "Receipt: {WO title} · {n} files"
- `recentlyChanged` gains an optional exclude set applied before the cap
- home.ts: RECENTLY CHANGED passes the set of ids every other card rendered
- home.ts: HEALTH dot green when zero issues; advisory list and count exclude `untested-bet` advisories whose id is on a rendered bets row
- home.ts: bets row WO-count color is faint (not green) when the bet is untested
- styles.css: bets-row title wraps; `.hv-time` and `.hv-meta` move to `--faint`
- Unit tests in derive.test.ts for the three derive changes; harness verification of the rendered home

## Out of scope

- Any new home card, section, expander, or stored state
- Collapsing or acknowledging HEALTH advisories (rejected in SRC-055)
- Linking this work order or any new frontmatter link to REQ-035 (would silently flip the bet's untested state — SRC-055)
- Sidebar, board, Outcomes view, topbar chip, or any surface other than the home tab
- Changing what counts as pending, a bet, or an advisory in core

## Requirements

- [[REQ-004]] — implements
- [[SRC-055]] — designed-by
- [[DEC-111]] — constrained-by
- [[WO-117]] — relates-to

## Acceptance tests

- [ ] A `ready` work order renders on IN FLIGHT with its status chip; the card count includes it
- [ ] A document rendered by AGENT ACTIVITY, RECENTLY LEARNED, CURRENT BETS, IN FLIGHT, or the judgment queue does not repeat in RECENTLY CHANGED
- [ ] Receipt activity rows show the work order title and file count, no commit hash
- [ ] With zero issues the HEALTH dot is green; an `untested-bet` advisory for a rendered bet appears only on the bets row, and the advisory count matches the rows shown
- [ ] An untested bet's done-WO count is not green; its title wraps at narrow widths instead of truncating
- [ ] `.hv-time` and `.hv-meta` computed colors are `--faint` in both themes
- [ ] `npm test` in packages/ui passes; terminal `veri check` reports zero issues

## Receipts

(none yet)
