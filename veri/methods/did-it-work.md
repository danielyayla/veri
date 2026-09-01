---
id: MET-008
type: method
title: "veri:did-it-work — three questions the receipt did not answer"
status: accepted
approved: 2026-08-28
description: >-
  The learning gate: after the work orders ship, the questions a receipt
  cannot answer. Use it when the shipping is finished and the verdict is
  not: "did the caching work actually move p95 latency to the target
  REQ-028 declared?", "we shipped the onboarding rewrite six weeks ago —
  did it actually help activation?", "all of REQ-035's work orders are
  done, was the bet right or do we retire it?". It keeps three questions
  apart — criteria met, constraints still holding, and what the declared
  metric did against its target — reaches one of four verdicts including
  inconclusive, and files reality's answer as an outcome source linked to
  the bet and to the work that shipped, without applying it to the
  requirement. Not for checking code against its spec before anything
  ships: "go through the diff on the wo-118 branch against its work order
  before I mark it done", "WO-124's acceptance criteria are all ticked —
  check whether we actually did what we said" are veri:review's, because
  nothing has shipped and there is no outcome yet to measure. Not for
  "thanks, that worked" or "summarise what you just changed".
requires:
  - file_source
  - get_document
  - get_neighbors
  - get_receipts
  - run_check
upstream: veri/did-it-work
created: 2026-08-27
updated: 2026-09-01
links:
  - id: WF-001
    rel: derived-from
  - id: SRC-060
    rel: derived-from
  - id: SRC-062
    rel: derived-from
  - id: REQ-040
    rel: serves
  - id: REQ-032
    rel: constrained-by
  - id: REQ-033
    rel: constrained-by
  - id: DEC-113
    rel: constrained-by
  - id: DEC-125
    rel: constrained-by
  - id: DEC-130
    rel: constrained-by
  - id: REQ-008
    rel: constrained-by
---

## Purpose

This gate is the stretch between a receipt and a judgment. A receipt says
the code exists; it says nothing about whether the thing the code was for
happened, and [[WF-001]]'s loop does not close until somebody asks.

**It is also the gate this project left unstaffed the longest.**
[[SRC-062]] measured it as of 2026-08-27: every work order then completed
and every source then filed, and not one of them carrying an `outcome-of`
link. This method therefore cannot be written
out of what a well-run project already does here — the absence is what it
exists to fix, and the coaching has to survive the pull that produced it.
What the user gets is an honest answer, including the one nobody wants,
and the characteristic failure here is not laziness but courtesy: an
agent that would rather report a small confirmation than a large "we
can't tell".

## What it reads

- **The hypothesis and its declared outcome, via `get_document`** — the
  metric and target as stated *before* the work started ([[REQ-032]]). A
  bet judged against a metric chosen afterwards is not a bet settled, it
  is a story fitted.
- **The shipping work orders and their receipts**, via `get_neighbors`
  and `get_receipts`: what was claimed done, when, which commits, which
  files. Question one is answered here and nowhere else.
- **`run_check()`.** The untested-bet advisory names exactly the bets
  whose work is done and whose answer never arrived — this gate's inbox.
  A violation against a constraint is question two answering itself.
- **The measurement itself, from wherever it lives** — analytics, a
  query, the corpus, a report someone wrote, or a source someone already
  filed through `veri:evidence-intake`. There is no MCP path to a metric
  and there should not be: the number comes from outside the record, and
  how it was obtained goes into the source. The pending block is context
  either way — a draft requirement is not a bet anyone has made yet
  ([[REQ-008]]).

All of it through the MCP tools ([[DEC-125]]): no reading `veri/` off
disk, no shelling out to the CLI.

## The interview

**One framing beat, three that report rather than ask, one of real
pressure, a read-back naming one of four verdicts, and two interrupts.**
This gate mostly computes and presents; its single hard question is beat
5, and skipping it is how outcome evidence becomes worthless.

1. **Separate the three questions before answering any of them.**

   > "Three questions with three different answers. Did we build what we
   > said — [[WO-117]] and [[WO-126]]'s acceptance criteria. Does what
   > must hold still hold — the constraints in play. Did the bet pay off
   > — [[REQ-035]] against the metric it declared. Separately, in that
   > order."

   Blending them is what this beat prevents: "we shipped it and the
   criteria are ticked" answers the first question and is routinely
   offered as an answer to the third.

2. **Question one — did we build what we said.** From the record: which
   criteria are ticked, which receipts exist, which SHAs and files they
   name. Where a tick has no evidence behind it, say so and name
   `veri:review`, which reads the diff. This gate takes the record at its
   word and says out loud that it is doing so.

3. **Question two — does what must hold still hold.** The constraints in
   play and the check's verdict on them. A constraint is verified by its
   acceptance criteria rather than by an outcome ([[REQ-032]]), so this
   turns on whether those still pass, not on who liked the result.

4. **Question three — what did the metric do**, against the target as
   declared:

   > "[[REQ-035]] declared <the metric>, target <the number>. Measured
   > <how, from where, over what window>: <the result>, <above | below |
   > at> target."

5. **Could this metric have moved? — the pressure beat**, and the one
   question separating evidence from decoration:

   > "Before the change shipped, what was this number? If it was already
   > past target, nothing we did could show up in it. How wide is the
   > window, and does the window itself cap what it can observe? Who is
   > missing from the sample?"

   [[SRC-062]] failed all three, so the improvement it appeared to find
   was an artifact of the instrument. A skipped beat 5 yields a confident
   number that means nothing — worse than no number, because it gets
   cited.

6. **Name the verdict — from four, not two — then file.**

   > "Verdict: <supported | refuted | inconclusive | unmeasured>.
   > *Supported*: past the target, with nothing in beat 5 explaining it
   > away. *Refuted*: it moved the other way, or did not move when it
   > could have. *Inconclusive*: measured, and the measurement cannot
   > discriminate — at ceiling already, a window too narrow, a sample
   > missing the cases that matter. *Unmeasured*: nobody looked. What it
   > means for [[REQ-035]] is yours."

7. **Interrupt — "it shipped, so it worked."**

   > "Shipping makes the question askable; it does not answer it. Nothing
   > has measured <the metric> since [[WO-117]] landed — untested, and
   > untested is not a small confirmation."

8. **Interrupt — the bet declares no outcome**, so nothing can settle it:

   > "<the requirement> is a hypothesis declaring no metric or target,
   > which `veri check` reports as an issue, not an advisory. I can
   > report what happened, not whether the bet paid. Naming the outcome
   > now is `veri:define`'s act — a new bet, declared after the fact and
   > honest about being so."

## What it files

- **One outcome source, via `file_source` with `kind: outcome`** — the
  measurement, its provenance (where the number came from, over what
  window, computed how), what beat 5 found about whether it could
  discriminate, and the verdict stated as a verdict about the *evidence*.
  Both edges, always: an outcome rel to the requirement, `outcome-of` to
  every work order that shipped against it.
- **What an inconclusive verdict files**, since it is the one people
  skip: a source like any other verdict, with rel `tests` — "bears on the
  bet without settling it" — whose body says *why* the measurement could
  not discriminate, in enough detail that the next person does not reach
  for the same instrument. [[SRC-062]] is that document. *Unmeasured*
  files no source at all, and its exit is `veri:evidence-intake`.
- **Proposed follow-ups, only when the user asks**: a draft requirement
  for a re-bet with a metric that can move; a hypothesis-hardens-into-
  constraint draft; a retirement recommendation, said in conversation and
  never written as a status. Nothing at all on the requirement itself —
  not its status, not its kind, not its declared outcome.

**Three mechanical facts, verified against `packages/core/src/check.ts`
and `packages/mcp/src/server.ts` on 2026-09-01:**

- **Direction is enforced at issue tier.** From a source,
  `tests`/`supports`/`refutes` must target a *requirement* and
  `outcome-of` a *work order*; anything else is an `invalid-outcome-link`
  issue. A backwards edge is not a smaller version of the right edge — it
  is a no-op leaving the bet untested forever ([[DEC-113]]).
- **Both edges or neither, and the tooling prefers no verdict.** The
  untested-bet advisory clears for a hypothesis whose linked work orders
  are all done and which *some* source links with an outcome rel; `tests`
  clears it exactly as `supports` does. Filing "we measured and cannot
  tell" closes the loop as completely as a confident verdict would, so a
  skill that overclaims is doing it for free.
- **`file_requirement` carries `kind` and `outcome`** (WO-137), so a
  re-bet drafted here is filed as a bet in the same call — `kind:
  hypothesis`, with the metric and the target that would settle it —
  exactly as [[MET-003]] and [[MET-005]] file theirs. The tool accepts a
  hypothesis with no outcome, but files it and reports that `veri check`
  calls it a violation. A re-bet left as a constraint never raises the
  untested-bet advisory, so nothing will ask whether *it* paid off.

## Guardrails

Every refusal names what is missing and what would fix it. A skill that
cannot file what it collected refuses rather than degrading
([[DEC-125]]).

- **Never changes a requirement's status, kind, or declared outcome.**
  Not confirmed, not retired, not hypothesis-into-constraint, not a
  quietly reworded metric. Outcome evidence never auto-applies a verdict
  ([[WF-001]] rule 9, [[REQ-033]]): this skill computes and presents, the
  user judges. There is no MCP path to any of those flips and this method
  wants none — every other missing capability here is a gap to repair,
  this one a boundary that is correct. *"Revising [[REQ-035]], replacing
  its metric, or retiring it is yours; I won't make the call by editing
  the requirement."*
- **Never rounds inconclusive toward a direction.** Four verdicts, and
  the third is not a softer version of the first two. *"It was measured,
  and it cannot tell us. Writing that down as 'slightly supported' would
  make every future reader trust this record less than they should."*
- **Never reports absence of evidence as confirmation**, and never files
  interpretation as observation — the source records what was measured
  and how; "so we should retire it" belongs in this conversation and in
  the follow-up draft ([[REQ-033]]). *"Nobody has measured it. That is
  untested, and it stays untested until somebody does."*
- **Never writes an `approved:` stamp.** Promotion is the user's act,
  always ([[REQ-008]], [[DEC-111]]).
- **Never blends the three questions**, and never lets a ticked criterion
  stand in for an outcome: work can be executed perfectly against a bet
  that was wrong.
- **Never judges a bet against a metric chosen after the fact.** If the
  declared metric was the wrong instrument, *that is the finding* — not a
  licence to substitute a nicer one.
- **A missing required tool is a refusal with a named repair.** Without
  `file_source` this gate is a retrospective ending in a chat log — the
  failure [[SRC-062]] found 123 times over.

## Handoff

The user's judgment comes first and it is not a skill: revise, retire,
harden, re-bet is the act nothing here performs, and no exit below is
reachable without it ([[WF-001]] rule 9). After it:

- **`veri:evidence-intake`** — when the verdict was *unmeasured*, or
  *inconclusive* because the instrument was wrong. What is needed is a
  measurement, and that gate is the door one comes through. It keeps the
  loop turning rather than closing it early, and it is the most common
  exit on a first attempt.
- **`veri:define`** — when the judgment is to revise intent: a re-bet
  with a metric that could move, or a requirement that no longer says
  what the project believes. The hypothesis frontmatter edit rides along.
- **`veri:decide`** — when the answer reopens a choice rather than a
  requirement: an active decision whose revisit condition just arrived in
  the shape of a number. Supersession, never a silent edit.
  **`veri:plan-work`** takes the other branch, when the bet was supported
  and the follow-on work is now worth cutting.
- **`veri:review`** ([[MET-010]]) — when question one could not be answered from the
  record: criteria ticked with no receipt, or a receipt whose files do
  not match the commit. Advanced tier; it reads the diff this gate does
  not.
- **Nowhere at all** is legitimate. A supported bet with nothing to
  change next is the loop working: the source is on the graph, it rides
  in that requirement's context package, the advisory has cleared.
