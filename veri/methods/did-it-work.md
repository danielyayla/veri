---
id: MET-008
type: method
title: "veri:did-it-work — three questions the receipt did not answer"
status: accepted
approved: 2026-09-01
description: >-
  The learning gate: after the work orders ship, the questions a receipt cannot answer. Use it when the shipping is finished and the verdict is not: "did the caching work actually move p95 latency to the target REQ-028 declared?", "we shipped the onboarding rewrite six weeks ago — did it actually help activation?", "all of REQ-035's work orders are done, was the bet right or do we retire it?". It keeps three questions apart — criteria met, constraints still holding, and what the declared metric did against its target — reaches one of four verdicts including inconclusive, and files reality's answer as an outcome source linked to the bet and to the work that shipped, without applying it to the requirement. Not for checking code against its spec before anything ships: "go through the diff on the wo-118 branch against its work order before I mark it done", "WO-124's acceptance criteria are all ticked — check whether we actually did what we said" are veri:review's, because nothing has shipped and there is no outcome yet to measure. Not for "thanks, that worked" or "summarise what you just changed".
requires: [file_source, get_document, get_neighbors, get_receipts, run_check]
upstream: veri/did-it-work
created: 2026-08-27
updated: 2026-09-01
links:
  - { id: WF-001, rel: derived-from }
  - { id: SRC-060, rel: derived-from }
  - { id: SRC-062, rel: derived-from }
  - { id: REQ-040, rel: serves }
  - { id: REQ-032, rel: constrained-by }
  - { id: REQ-033, rel: constrained-by }
  - { id: DEC-113, rel: constrained-by }
  - { id: DEC-125, rel: constrained-by }
  - { id: DEC-130, rel: constrained-by }
  - { id: REQ-008, rel: constrained-by }
---
## Purpose

The stretch between a receipt and a judgment: the code exists, but did
the thing it was for happen? The gate this project left unstaffed
longest — [[SRC-062]] found not one `outcome-of` link on the record —
so the coaching must survive the pull that produced that absence. Its
characteristic failure is courtesy: preferring a small confirmation to
a large "we can't tell".

## What it reads

- **The hypothesis and its declared outcome** (`get_document`) — metric
  and target as stated *before* the work ([[REQ-032]]); judged against
  a metric chosen afterwards, a bet is a story fitted.
- **The shipping work orders and receipts** (`get_neighbors`,
  `get_receipts`) — question one is answered here and nowhere else.
- **`run_check()`** — the untested-bet advisory is this gate's inbox.
- **The measurement itself, from wherever it lives** — no MCP path to a
  metric exists and none should: the number comes from outside;
  provenance goes in the source. Drafts stay non-binding ([[REQ-008]]);
  the record only through MCP ([[DEC-125]]).

## The interview

One framing beat, three that report, one of real pressure, a read-back
naming one of four verdicts, two interrupts.

1. **Separate the three questions** — built what we said; constraints
   still holding; the bet paid — in that order, never blended.
2. **Question one — did we build what we said.** From the record:
   ticks, receipts, SHAs; a tick with no evidence names `veri:review`.
3. **Question two — does what must hold still hold.** Constraints are
   verified by their criteria, not by outcomes ([[REQ-032]]).
4. **Question three — what did the metric do** against the declared
   target: measured how, from where, over what window.
5. **Could this metric have moved? — the pressure beat.** Already past
   target? Window too narrow? Sample missing the cases that matter?
   [[SRC-062]] failed all three — a skipped beat 5 yields a confident
   number that means nothing, and gets cited.
6. **Name the verdict — from four — then file.** *Supported*: past
   target, nothing in beat 5 explaining it away. *Refuted*: moved the
   other way, or did not move when it could have. *Inconclusive*:
   measured, cannot discriminate. *Unmeasured*: nobody looked. What it
   means for the requirement is the user's.
7. **Interrupt — "it shipped, so it worked."** Shipping makes the
   question askable; it does not answer it.
8. **Interrupt — the bet declares no outcome.** Nothing can settle it
   (a check issue); naming an outcome now is `veri:define`'s act — a
   new bet, honest about being declared late.

## What it files

- **One outcome source** (`file_source`, `kind: outcome`) — the
  measurement, its provenance, what beat 5 found, the verdict stated as
  a verdict about the *evidence*. Both edges, always: an outcome rel to
  the requirement, `outcome-of` to every shipping work order.
- **Inconclusive files too** — rel `tests`, the body saying *why* the
  instrument could not discriminate ([[SRC-062]] is that document).
  *Unmeasured* files nothing; its exit is `veri:evidence-intake`.
- **Proposed follow-ups only when asked** — a re-bet draft, a hardening
  draft; a retirement stays spoken, never written as status. Nothing on
  the requirement itself.

Mechanical: direction is enforced at issue tier — from a source,
`tests`/`supports`/`refutes` target a *requirement*, `outcome-of` a
*work order*; a backwards edge is a no-op leaving the bet untested
forever ([[DEC-113]]). The advisory clears for done work orders plus
any outcome rel — `tests` counts like `supports`, so "measured and
cannot tell" closes the loop for free. A re-bet files as a bet in one
call — `file_requirement` carries `kind` and `outcome` (WO-137); left
a constraint, nothing ever asks whether *it* paid.

## Guardrails

- **Never changes a requirement's status, kind, or declared outcome**
  ([[WF-001]] rule 9, [[REQ-033]]) — this skill computes and presents,
  the user judges; this missing capability is a boundary, not a gap.
- **Never rounds inconclusive toward a direction** — the third verdict
  is not a softer version of the first two.
- **Never reports absence of evidence as confirmation**, never files
  interpretation as observation.
- **Never writes an `approved:` stamp.** Promotion is the user's act,
  always ([[REQ-008]], [[DEC-111]]).
- **Never blends the three questions** — perfect execution can serve a
  wrong bet.
- **Never judges against a metric chosen after the fact** — a wrong
  instrument is the finding, not a licence to substitute.
- **A missing required tool is a refusal with a named repair** — a
  retrospective ending in a chat log is the failure [[SRC-062]] found.

## Handoff

The user's judgment comes first and is not a skill: revise, retire,
harden, re-bet ([[WF-001]] rule 9). After it:

- **`veri:evidence-intake`** — *unmeasured*, or *inconclusive* with a
  wrong instrument: the most common first exit.
- **`veri:define`** — a re-bet with a metric that could move, or
  revised intent; the frontmatter edit rides along.
- **`veri:decide`** — a revisit condition arriving as a number;
  **`veri:plan-work`** — a supported bet's follow-on work.
- **`veri:review`** ([[MET-010]]) — question one unanswerable from the
  record: it reads the diff this gate does not.
- **Nowhere at all** — a supported bet with nothing to change is the
  loop working; the advisory has cleared.
