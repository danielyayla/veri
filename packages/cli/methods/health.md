---
id: MET-009
type: method
title: "veri:health — the periodic sweep for decay the check cannot see"
status: accepted
approved: 2026-08-28
description: >-
  The periodic inspection: the decay `veri check`'s hard rules cannot catch, swept and filed so two sweeps months apart compare. Use it when the question is the record's condition rather than its content: "how healthy is this project? anything rotting?", "it has been a quarter — sweep the record for decisions whose revisit conditions have arrived and claims nobody ever finished", "tell me what we left behind after three hard weeks". It reports first and triaged — stale documents, arrived revisit conditions, abandoned claims, untested bets, orphans, the age of your stamp queue — then asks only which you want to act on, and files a health-report source with a fixed shape so the next sweep is a comparison, not a fresh impression. It proposes; it repairs nothing. Not for running the stamp queue itself: "what is waiting on me?", "walk me through everything that needs my stamp before we plan the next batch" — that is an approval pass you run yourself, `veri approve` or the app's review queue, document by document. Not for "run the test suite", "why is this test flaky?", "the CI matrix is failing on Node 18 — fix it".
requires: [run_check, list_documents, get_queue, get_receipts, file_source]
upstream: veri/health
created: 2026-08-27
updated: 2026-09-01
links:
  - { id: WF-001, rel: derived-from }
  - { id: SRC-060, rel: derived-from }
  - { id: SRC-062, rel: derived-from }
  - { id: REQ-040, rel: serves }
  - { id: REQ-041, rel: informed-by }
  - { id: DEC-125, rel: constrained-by }
  - { id: DEC-130, rel: constrained-by }
  - { id: REQ-008, rel: constrained-by }
---
## Purpose

The one gate with no work in front of it: it runs because time has
passed, and a record decays quietly. What the user gets is a
*comparable* answer — the report has a fixed shape, states its
parameters, and links the sweep before it: what is reported is the
difference. Its characteristic failure is the tidy-up: a record
maintained by an agent nobody watched is a record nobody can cite.

## What it reads

- **`run_check()`, first and in full** — check computes half the
  findings already; this method re-derives none and **adds no rules**.
- **The `skipped` list, as a finding** — over MCP the git tier does not
  run; "healthy" without saying so is a lie the next sweep inherits.
- **`list_documents`** twice — `updated_before` for the stale tail
  (cutoff chosen out loud), by `status` for the stamp queue and its
  oldest member ([[REQ-008]]).
- **`get_queue()`** for claims and holders (rule 8); **`get_receipts()`**
  to correlate shipped against touched.
- **Active decisions' revisit conditions, read from the documents** —
  whether one has arrived is judgment, which is why it belongs to a
  gate and not a check. All through MCP ([[DEC-125]]).

## The interview

Five beats that report, one question, one interrupt — the questions
belong to the gates this one routes into.

1. **State the sweep's parameters before any finding** — date, cutoff,
   claim window, document count, check results, skipped tiers, previous
   sweep (or "none — this is the baseline"). An undeclared cutoff
   change makes the trend an artifact ([[SRC-062]], in report form).
2. **Report what check found, triaged, not repeated** — violations
   first, named as breakage; advisories grouped by kind with counts:
   eleven intuition-only requirements is a posture, one an oversight.
3. **Sweep the judgment-shaped remainder** — arrived revisit
   conditions; requirements untouched while their code churned; uncited
   sources; abandoned claims; bets at target when filed ([[SRC-062]]).
   Each finding names the document, the heuristic, what would clear it
   — **each labelled a heuristic out loud**.
4. **File the report, then ask the one question** — in that order, so
   the report exists when the answer is "nothing". Picked findings
   become work through `veri:plan-work`; the rest stays for next time.
5. **Close by naming what the sweep could not see** — the skipped tier,
   and anything declined as beyond judgment.
6. **Interrupt — "just clean it up." It fires every time.** A pass that
   edits the record on its own initiative makes the report
   untrustworthy, including the parts that are right.

## What it files

- **One health-report source** (`file_source`, `kind: investigation`)
  with a fixed five-part shape, in order: **parameters**; **a counts
  table with the same rows every time** — violations, advisories by
  kind, pending stamps and oldest age, claims and oldest, untested
  bets, orphans, stale tail — **zero rows printed as zero, never
  omitted**; **findings** triaged, each with document, heuristic, and
  what clears it; **what was acted on** (ids); **what was not looked
  at**. Linked `derived-from` to the previous health source — the
  comparability spine.
- **Nothing else by itself** — picked findings are cut by
  `veri:plan-work`; `file_work_order` is deliberately absent from
  `requires:` because a sweep without it still delivered its artifact.

Mechanical: `run_check` over MCP is always partial — the git tier
cannot run, so `pass: true` means "the checks that could run passed",
in those words. `list_documents` excludes withdrawn documents unless
asked by status — forgetting that counts abandoned work as decay. This
gate files no check rule and proposes none into `veri check`: a
recurring finding goes to `veri:decide`, then its own work order.

## Guardrails

- **Strictly propose-only; it repairs nothing** — not a status flip,
  not a withdrawal, not a tidied link, not a "while I was in there".
- **Never writes an `approved:` stamp.** Promotion is the user's act,
  always ([[REQ-008]], [[DEC-111]]). This is the gate standing closest to
  a pile of documents that look like they ought to be cleaned up, which
  is exactly why the rule is stated here rather than assumed.
- **Never reports a partial sweep as a whole one** — `skipped`
  verbatim, in conversation and in the filed report.
- **Every staleness threshold is a heuristic and labelled one** —
  untouched is not wrong.
- **Never adds a rule to `veri check`, never speaks as though it had.**
- **Never triages by volume** — what matters is what changed since the
  last sweep.
- **Never recommends withdrawal as a default**, and **never edits
  accepted canon** — resolving a contradiction is `veri:decide`'s.
- **A missing required tool is a refusal with a named repair** —
  without `file_source` the next sweep has nothing to compare against.

## Handoff

**No single successor: a sweep produces a list**, and what waits in
every case is the user's pick.

- **`veri:did-it-work`** — every untested bet found: the most valuable
  thing a sweep produces.
- **`veri:plan-work`** — the findings picked in beat 4.
- **`veri:wayfinder`** — "I don't know where to start": a list is not
  a plan.
- **`veri:decide`** — an arrived revisit condition, or a finding that
  wants to become a check rule.
- **The user's own approval pass** — when the pending queue *is* the
  finding: `veri approve`, document by document.
- **Nowhere at all** — a clean sweep still files its report: the
  baseline is the artifact.
