---
id: MET-009
type: method
title: "veri:health — the periodic sweep for decay the check cannot see"
status: accepted
approved: 2026-08-28
description: >-
  The periodic inspection: the decay `veri check`'s hard rules cannot
  catch, swept and filed so two sweeps months apart compare. Use it when
  the question is the record's condition rather than its content: "how
  healthy is this project? anything rotting?", "it has been a quarter —
  sweep the record for decisions whose revisit conditions have arrived
  and claims nobody ever finished", "tell me what we left behind after
  three hard weeks". It reports first and triaged — stale documents,
  arrived revisit conditions, abandoned claims, untested bets, orphans,
  the age of your stamp queue — then asks only which you want to act on,
  and files a health-report source with a fixed shape so the next sweep
  is a comparison, not a fresh impression. It proposes; it repairs
  nothing. Not for running the stamp queue itself: "what is waiting on
  me?", "walk me through everything that needs my stamp before we plan
  the next batch" are veri:approval-session's, which needs you present
  document by document. Not for "run the test suite", "why is this test
  flaky?", "the CI matrix is failing on Node 18 — fix it".
requires:
  - run_check
  - list_documents
  - get_queue
  - get_receipts
  - file_source
upstream: veri/health
created: 2026-08-27
updated: 2026-08-28
links:
  - id: WF-001
    rel: derived-from
  - id: SRC-060
    rel: derived-from
  - id: SRC-062
    rel: derived-from
  - id: REQ-040
    rel: serves
  - id: REQ-041
    rel: informed-by
  - id: DEC-125
    rel: constrained-by
  - id: DEC-130
    rel: constrained-by
  - id: REQ-008
    rel: constrained-by
---

## Purpose

This is the one gate with no work in front of it. Every other method in
the library runs because somebody wants something; this one runs because
time has passed. A record decays quietly — a requirement nobody re-read
while the code it binds was rewritten twice, a decision whose revisit
condition arrived nine weeks ago, a claim somebody abandoned.

What the user gets from it is a *comparable* answer. A one-off impression
of a project's health is nearly worthless: every large record looks
alarming on first inspection, and the signal is direction, not level. So
the report has a fixed shape, states its own parameters, and links the
sweep before it — what is being reported is the difference.

Its characteristic failure is the tidy-up: a sweep that repairs what it
finds destroys the trust it exists to protect, because a record
maintained by an agent nobody watched is a record nobody can cite.

## What it reads

- **`run_check()`, first and in full** — violations, advisories, and the
  `skipped` list. Check already computes half of this gate's findings:
  untested bets, stale claims, a stale focus, orphan work orders,
  intuition-only requirements, missing sections. This method re-derives
  none of them and **adds no rules**; it triages what check reports and
  sweeps the judgment-shaped remainder on top of it.
- **The `skipped` list, treated as a finding rather than a footnote.**
  Over MCP the git-backed tier does not run, so provenance and binding
  drift — a receipt citing a commit that does not exist, a requirement
  whose bound code has churned — are simply invisible here. A sweep that
  reports "healthy" without saying it never looked at git is a lie the
  next sweep inherits.
- **`list_documents`** twice: once with `updated_before` for the stale
  tail, the cutoff chosen out loud and written into the report rather
  than assumed, and once by `status` for the queue awaiting the user's
  stamp and how long its oldest member has waited ([[REQ-008]]).
- **`get_queue()`** for ready depth and every in-progress claim with its
  holder and date ([[WF-001]] rule 8), and **`get_receipts()`** to
  correlate what the record says shipped with what it says it touched.
- **The active decisions' revisit conditions, read out of the documents
  themselves.** No rule computes this and none should: whether a
  condition has arrived is judgment, which is why it belongs to a gate
  rather than to a check.

All of it through the MCP tools ([[DEC-125]]): no reading `veri/` off
disk, no shelling out to the CLI. The two capabilities [[SRC-060]]'s card
listed as gaps now exist ([[REQ-041]] items 1 and 3), so the only blind
spot left is the git tier — named, rather than routed around.

## The interview

**This gate barely interviews: five beats that report, one question, and
one interrupt.** The questions belong to the gates it routes into, and a
sweep that opened with an interview would be asking the user to do the
reading it was invoked to do.

1. **State the sweep's parameters before any finding.** Unconditional,
   and it is the single thing that makes two sweeps comparable:

   > "Sweep on <date>. Staleness cutoff <the updated-before date>, claim
   > window <n> days. Check ran over <n> documents: <v> violations, <a>
   > advisories. Not run: <the skipped list, verbatim> — the git tier
   > needs a terminal `veri check`. Previous sweep: <the last health
   > source, or 'none — this is the baseline'>."

   A sweep whose cutoff differs from the last one and does not say so
   produces a trend that is an artifact of its own parameters —
   [[SRC-062]]'s finding about a metric, arriving in a report instead.

2. **Report what check already found, triaged rather than repeated.**
   Violations first, and named as breakage rather than as decay — they
   are a broken knowledge base, not an aging one. Then advisories grouped
   by kind, with counts, because the count is the signal: eleven
   intuition-only requirements is a posture somebody chose, one is an
   oversight.

3. **Sweep the judgment-shaped remainder** — the part no rule computes:
   active decisions whose revisit conditions have arrived; requirements
   untouched since the cutoff while the code they bind kept moving;
   sources nothing has ever cited; claims past the window that were
   abandoned rather than paused; hypotheses whose metric was already at
   target when the bet was filed ([[SRC-062]]). Each finding names the
   document, the heuristic that flagged it, and what would clear it —
   **each labelled a heuristic out loud**, because untouched is not
   wrong.

4. **File the report, then ask the one question.** In that order, so the
   report exists even when the answer is "nothing":

   > "Filed as <the health source>, linked to the previous sweep. Of the
   > <n> findings, which do you want to act on? The ones you pick become
   > work orders through `veri:plan-work`; everything else stays on the
   > record for next time."

   A different answer changes only what leaves this session, never the
   report — which is why the report is filed first.

5. **Close by naming what the sweep could not see:** the skipped tier
   again, and anything it declined to judge. A sweep's last sentence
   belongs to its own limits, not to its findings.

6. **Interrupt — when the user asks it to fix what it found.** Fires on
   "just clean it up", and it fires every time:

   > "I can propose every one of these. I can't apply them: a
   > maintenance pass that edits the record on its own initiative is the
   > one thing that would make this report untrustworthy — including the
   > parts of it that are right. Pick what you want and it becomes work
   > with your stamp on it."

## What it files

- **One health-report source, via `file_source` with
  `kind: investigation`**, and its shape is fixed on purpose. Two sweeps
  a month apart are comparable only if they answer the same questions in
  the same order with their parameters declared, so the report always
  carries these five parts, in this order:

  1. **Parameters** — the sweep date, the `updated_before` cutoff, the
     claim-staleness window in days, the document count, and which check
     tiers ran and which were skipped.
  2. **A counts table with the same rows every time** — violations;
     advisories by kind; documents pending a stamp, and the oldest one's
     age; in-progress claims, and the oldest; untested bets; orphans; the
     stale tail at the stated cutoff. **Rows that are zero are printed as
     zero, never omitted**: an absent row and a zero row look identical a
     month later and mean opposite things.
  3. **Findings**, triaged by severity, each naming the document id, the
     heuristic that flagged it, and what would clear it.
  4. **What was acted on** — the ids of everything filed out of this
     sweep, so the next sweep can ask whether any of it landed.
  5. **What was not looked at** — the skipped tier, and anything declined
     as beyond judgment.

  Linked `derived-from` to the previous health source. That chain is the
  comparability spine: a reader who wants the trend follows the links
  rather than searching by title.

- **Nothing else, by itself.** The maintenance work the user picks is cut
  by `veri:plan-work`, which owns work-order boundaries and acceptance
  criteria; this gate hands over the findings and their ids.
  `file_work_order` is deliberately absent from `requires:` for that
  reason: a sweep that cannot file a work order has still delivered its
  whole artifact, and `requires:` holds only what breaks the gate.

**Three mechanical facts, verified against `packages/mcp/src/server.ts`
and `packages/core/src/check.ts` on 2026-08-27:**

- **`run_check` over MCP is always a partial verdict.** It returns
  `pass`, `format`, `documents`, `violations`, `advisories` and
  `skipped`; the git-backed tier cannot run because the server spawns no
  subprocesses. `pass: true` here means "the checks that could run
  passed", and the report says so in those words.
- **`list_documents` excludes withdrawn documents unless they are asked
  for by status**, and marks pending ones. A staleness sweep that forgot
  the first would count abandoned work as decay and inflate every number
  in the table.
- **This gate files no check rule and proposes none into `veri check`.**
  A finding that recurs often enough to want a rule is a proposed
  decision through `veri:decide` and then its own work order. Inventing a
  rule inside a health sweep would add a gate to the system that nobody
  approved, which is the same act this gate refuses when it refuses to
  repair.

## Guardrails

Every refusal names what is missing and what would fix it. A skill that
cannot file what it collected refuses rather than degrading
([[DEC-125]]).

- **Strictly propose-only; it repairs nothing.** Not a status flip, not a
  withdrawal, not a tidied link, not a "while I was in there". *"Every
  one of these can become work you approve. None of them is mine to
  apply."*
- **Never writes an `approved:` stamp.** Promotion is the user's act,
  always ([[REQ-008]], [[DEC-111]]). This is the gate standing closest to
  a pile of documents that look like they ought to be cleaned up, which
  is exactly why the rule is stated here rather than assumed.
- **Never reports a partial sweep as a whole one.** The `skipped` list
  appears verbatim in the conversation and in the filed report.
- **Every staleness threshold is a heuristic and is labelled one.**
  "Untouched for ninety days" is a prompt to look, never a verdict on the
  document.
- **Never adds a rule to `veri check`, and never speaks as though it
  had.** A finding that wants to be a rule goes to `veri:decide` as a
  proposed decision, and then to its own work order.
- **Never triages by volume.** The loudest advisory kind is usually a
  posture the project adopted deliberately; the finding that matters is
  the one that changed since the last sweep.
- **Never recommends withdrawal as a default** — a source nothing links
  to may be evidence waiting for its question — **and never edits
  accepted canon** to make a finding go away. Noticing a contradiction is
  this gate's job; resolving it is `veri:decide`'s.
- **A missing required tool is a refusal with a named repair.** Without
  `run_check` the sweep is impressions; without `list_documents` the
  stale tail and the pending queue are invisible; without `file_source`
  the report exists only in a transcript and the next sweep has nothing
  to compare against, which defeats the entire gate.

## Handoff

**No single successor: a sweep produces a list, and each item exits
somewhere different.** What waits, in every case, is the user's pick —
this gate leaves nothing else pending.

- **`veri:did-it-work`** — for every untested bet the sweep found, and
  this is the most valuable thing a sweep produces. The advisory has been
  sitting there since the work shipped; that gate is the one that answers
  it, and answering it is how [[WF-001]]'s loop closes.
- **`veri:plan-work`** — for the findings the user picked in beat 4. They
  become backlog work orders and wait for the stamp like any other work.
- **`veri:wayfinder`** — when the sweep surfaced more than one session
  can triage, or when the answer to beat 4 is "I don't know where to
  start". The front door takes the findings and routes them one at a time
  against what the project is actually steering toward. A list is not a
  plan, and this gate does not pretend it is one.
- **`veri:decide`** — for an active decision whose revisit condition has
  arrived, and for a recurring finding that wants to become a check rule.
  Supersession, never a silent edit.
- **`veri:approval-session`** — when the pending queue *is* the finding.
  Documents waiting weeks for a stamp are not a records problem; they are
  a gate nobody is standing at. Advanced tier.
- **`veri:archaeology`** — for an area whose documents are old, whose
  code has moved, and where nobody remembers why. Advanced tier.
- **Nowhere at all**, and it is a real outcome. A sweep finding nothing
  worth acting on still files its report: the baseline is the artifact,
  and every future sweep depends on this one existing.
