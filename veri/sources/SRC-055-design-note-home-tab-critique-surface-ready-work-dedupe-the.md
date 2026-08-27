---
id: SRC-055
type: source
title: "Design note — home tab critique: surface ready work, dedupe the feeds, honest quiet text"
status: imported
created: 2026-08-27
updated: 2026-08-27
links:
  - id: SRC-053
    rel: builds-on
  - id: REQ-004
    rel: designs
  - id: DEC-012
    rel: constrained-by
---

> Drafted 2026-08-27 by an agent session (Claude Code) from a design
> critique Daniel requested of the Home tab ("more useful, without
> adding complexity") and his follow-up instruction to implement the
> critique's recommendations. The critique ran against the real
> renderer (dist frontend served in a browser harness with a fake
> `window.veri` shim) over this project's live snapshot, so every
> finding below was observed, not hypothesized.

## The question

The intent home ([[SRC-053]], [[REQ-035]]) has the right skeleton —
judgment queue, bets, health, feeds, in the WHY→WHAT→HOW→DID IT WORK
order — but a critique pass found the bottom half of the screen
repeating itself while the view stayed silent about the one thing a
visitor could act on. What changes make the same surface more useful
with no new elements?

## Findings and the chosen design

**1. Ready work orders are invisible — IN FLIGHT includes `ready`.**
`inFlight` filtered to backlog/in-progress; WO-104 sat `ready` (by
[[WF-001]]'s own vocabulary, work an agent can pick up now) while the
card said "Nothing in flight" and the sidebar counted 1. The most
actionable fact in the project was the one the home hid. The fix is
the smallest one: `ready` joins the filter. The existing status chip
already renders `ready` in its own color; no new UI.

**2. Three feeds, one story — RECENTLY CHANGED excludes what other
cards already show.** AGENT ACTIVITY, RECENTLY LEARNED, and RECENTLY
CHANGED shared most of their rows (observed: WO-119 and WO-118 in both
activity and changed; SRC-054 in both learned and changed; REQ-035 in
changed and CURRENT BETS). RECENTLY CHANGED sorts all docs by
`updated`, a near-superset of the other feeds with less context. The
design: at render time the home collects the ids every other card
displayed and RECENTLY CHANGED filters them out before its cap — it
becomes the card that catches edits the other feeds cannot explain
(re-stamps, workflow edits, amendments). Subtraction, not a feature:
`recentlyChanged` gains an optional exclude set, the card keeps its
name, empty state, and cap.

**3. Receipt rows bury the payload — the WO title replaces the commit
hash.** "Receipt filed: commit 82a9520 · 7 files" led with the two
least useful facts, and five of eight activity rows were near-identical
hash lines. Decisions already show their titles. Receipt rows become
"Receipt: {WO title} · {n} files"; the hash stays on the work order
document the row opens.

**4. The untested-bet fact was stated twice — CURRENT BETS owns it.**
REQ-035's untested state appeared as the bets row's chip *and* as the
first HEALTH advisory. Per [[SRC-053]] the bets card owns bet state, so
HEALTH filters out `untested-bet` advisories **whose id is on a
rendered bets row** (precise: an untested hypothesis that somehow has
no bets row keeps its advisory). The card's advisory count follows the
filtered list — the card counts what it shows.

**5. Shipped ≠ proven, so green must not celebrate an untested bet.**
On the bets row the green "1/1 WOs done" was the strongest color signal
while the bet's whole point is that shipping does not settle it. When
`untested` is true the WO count renders faint, not green; the untested
chip keeps the emphasis. Green still marks done counts on bets with
evidence or in-progress work orders.

**6. The bet title is the bet — it wraps instead of truncating.** At
moderate widths the title ellipsized while the metric, chip, and WO
count kept full width. On bets rows only, the title wraps to further
lines; the metadata spans keep their nowrap.

**7. Quiet text was below contrast floor — one token step up.**
`.hv-time` (10px, `--ghost` #55525E on #151519 ≈ 2.6:1) and `.hv-meta`
(10.5px, `--ghost-2` ≈ 2.2:1) both fail WCAG AA 4.5:1, and the meta
spans are load-bearing ("clean · 4 advisories", "1 hypothesis"). Both
move to `--faint` (≈ 5.1:1 dark; light theme's `--faint` #6B6873 also
passes). Sizes unchanged.

**8. The HEALTH dot follows the verdict.** It was hardcoded amber even
when the meta said "clean" in green; it now mirrors the text's rule
(amber when issues, green when clean) — the same convention the
ARCHITECTURE card already follows.

## Rejected along the way

- Collapsing HEALTH advisories to kind+count lines when clean — worth
  considering later, but it adds an expand affordance (complexity)
  and the untested-bet filter already removes the noisiest row.
- Linking the implementing work order to [[REQ-035]] in frontmatter —
  `currentBets` counts *any* frontmatter link either direction, so the
  link would silently flip the bet out of its untested state while the
  work is in progress. The bet's linkage stays as WO-117 left it; this
  note names REQ-035 in prose only.
- A "ready" sub-section or new card for pickable work — the status
  chip on the existing IN FLIGHT rows already distinguishes ready from
  in-progress.

## Provenance

Critique and design produced in-session against
packages/ui/src/renderer/views/home.ts, derive.ts, and
renderer/styles.css at commit c2c5e97.
