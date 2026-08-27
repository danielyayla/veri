---
id: SRC-053
type: source
title: "Design note — the intent home: current bets, awaiting judgment, recently learned"
status: imported
approved: 2026-08-26
created: 2026-08-26
updated: 2026-08-26
links:
  - id: REQ-035
    rel: designs
  - id: DEC-012
    rel: constrained-by
  - id: DEC-111
    rel: constrained-by
  - id: SRC-050
    rel: builds-on
  - id: SRC-052
    rel: builds-on
---

> Drafted 2026-08-26 by an agent session (Claude Code) implementing
> [[WO-117]], under Daniel's blanket authorization to implement the
> pivot batch in its entirety — the same authorization and provenance
> shape as [[SRC-051]] and [[SRC-052]]. Stamped `approved:` on that
> authorization; Daniel reviewed and confirmed the approval on
> 2026-08-27.

## The question

[[REQ-035]] moves the app's conceptual center from the execution board
to an intent view: what are we betting on, what awaits my judgment,
what did we recently learn? Where does that view live, how do the
three sections lay out, how does a hypothesis requirement show its bet
and its shipping state, how are untested bets and outcome sources made
visible, and where do judgment actions land?

## Entry point: the intent home IS the Home view

The intent home is not a new navigation destination. The existing Home
view — the default tab, the first row of the sidebar (`⌂ Home`), the
topbar health chip's target — *becomes* the intent home by gaining the
missing section (current bets), reframing the one it already had
(NEEDS REVIEW becomes AWAITING JUDGMENT), and adding the learning feed
(RECENTLY LEARNED). Primary navigation is untouched: Home stays first,
Architecture stays, the board stays reachable exactly as before —
nothing is removed or demoted, the center of gravity just gains the
intent sections. A second "Intent" row beside "Home" would make two
half-homes and force a which-is-default decision REQ-035 already
answers: the primary surface is the intent surface.

## Layout

Top to bottom, inside the existing `hv-wrap` column:

1. **Project header** — unchanged.
2. **AWAITING JUDGMENT** (full-width, amber) — the existing pending
   card (SRC-006's NEEDS REVIEW) under the intent vocabulary. Same
   derivation (`pendingDocs`: draft requirements, proposed decisions,
   draft workflow, oldest first), same import grouping, same rows. The
   head meta reads `N gate crossings` — these are the acts only a
   human can perform. START HERE / brownfield cards keep sharing the
   slot in an empty project.
3. **CURRENT BETS** (full-width, new) — one row per bet, see below.
4. **The grid** — HEALTH, ARCHITECTURE, IN FLIGHT, AGENT ACTIVITY,
   **RECENTLY LEARNED** (new), RECENTLY CHANGED.

Judgment order leads because it is the queue that blocks other actors;
bets are standing context beneath it.

## CURRENT BETS

Derivation: requirements with effective kind `hypothesis` (core's
`requirementKind`, absent-means-constraint) whose status is `accepted`
— a draft bet is still awaiting judgment, a retired or withdrawn one
is out of play. Ordered by id. Each row is one button opening the
requirement (preview surface, ⌘-click background — the app's row
grammar):

- **REQ id** in the requirement type color, then **title**.
- **Outcome target**: core's `outcomeLabel` (`metric target`) rendered
  as a muted `→ metric target` chip — the bet's win condition, always
  visible. A hypothesis missing its outcome shows `no outcome
  declared` in amber (check already flags it; the row agrees).
- **Work-order state**: `done/total WOs` over the linked work orders —
  the same linkage the untested-bet check reads (a WO linking the REQ
  or the REQ linking the WO, either direction, withdrawn WOs excluded)
  — green when all done, ember while shipping, muted `no WOs yet`
  when nothing has picked the bet up.
- **The bet's epistemic state**, exactly one of:
  - `● untested bet` — amber chip, shown iff the check derivation's
    `untested-bet` advisory names this requirement (the view reuses
    the snapshot's advisories; it never recomputes the rule) — shipped,
    awaiting reality's answer;
  - `evidence: SRC-0xx supports` (or tests/refutes) — the outcome
    sources that have reported, each named;
  - nothing — the bet is still shipping or unstarted.

Empty state (no accepted hypotheses): a one-line teaching empty —
"No bets yet — a requirement with `kind: hypothesis` and an outcome
target becomes a bet." The card renders even when empty: the section
teaches the vocabulary the pivot introduces (the SRC-013 posture).

## RECENTLY LEARNED

Derivation: non-withdrawn sources, newest `created` first, capped at
8 — what most recently entered the evidence door. (RECENTLY CHANGED
keeps answering "what was edited"; this card answers "what did we
learn" and includes only sources.)

- Ordinary source row: SRC id (source color), title, `filed <rel
  time>`. One button, opens the source.
- **Outcome source row** — visually distinct: the row carries a
  verdict chip naming the relation and the bet, `supports REQ-042`
  (green), `refutes REQ-042` (amber), `tests REQ-042` (muted). The
  chip is its own button opening the hypothesis requirement; the rest
  of the row opens the source — a split row (div containing two
  buttons), because one row genuinely has two targets and nesting
  buttons is not markup. Outcome-ness is read from the source's own
  links (core's `isOutcomeRel`), the DEC-113 vocabulary.

Empty state: "No sources yet — evidence comes first."

## Statelessness and routing

The view holds no authoritative state: every section derives from the
snapshot's documents plus the check derivation's advisories, both of
which the sidecar already ships — no new sidecar reads, no new
storage, no session flags. Deleting the view would lose rendering
only. Judgment actions route to existing surfaces: an awaiting-
judgment row opens the document in the reader, where the review
banner (SRC-006) carries Approve; bet and learned rows open their
documents; nothing on the home writes.

## Rejected alternatives

- **A separate Intent view in the sidebar** — two homes, neither
  primary; REQ-035 names the primary surface, and the existing Home is
  it.
- **Replacing RECENTLY CHANGED with RECENTLY LEARNED** — they answer
  different questions (edits vs. evidence); the WO forbids demoting
  existing views, and the grid has room.
- **Recomputing the untested-bet rule in the renderer** — a second
  evaluation site that can drift from `veri check`; the advisory is
  already in the snapshot (the DEC-116 posture: one implementation,
  evaluated where core runs).
- **A bets board with columns (shipping / untested / answered)** —
  ceremony ahead of evidence; rows with an epistemic-state chip carry
  the same information at feed density, and a board invites drag
  semantics the statuses forbid.
- **Making the whole outcome row open the requirement** — the row
  names a source; opening something other than what a row names breaks
  the app's row grammar. The split row keeps both targets honest.
