---
id: MET-010
type: method
title: "veri:review — spec fidelity of the diff, read against the work order before done"
status: accepted
approved: 2026-09-01
description: >-
  The pre-done gate: the branch diff read against the work order that produced it, by a session that did not write it. Use it before done: "go through the diff on the wo-118 branch against its work order before I mark it done", "WO-124's acceptance criteria are all ticked — check whether we actually did what we said", "read the last five receipts and tell me whether any of them smuggled a decision into code without a DEC". It reports rather than asks — every in-scope item delivered, nothing out-of-scope touched, every criterion genuinely evidenced, no linked decision silently contradicted — findings ranked important/nit, nits capped at five, each citing the clause it violates. Not for judging what shipped against its declared outcome: "did the caching work actually move p95 latency to the target REQ-028 declared?", "we shipped the onboarding rewrite six weeks ago — did it actually help activation?" are veri:did-it-work's, because those need reality's answer, not the diff. Not for general code review with no work order behind the diff — the harness's own tooling — nor for "run the test suite", "summarise what you just changed".
requires: [get_context, run_check, file_decision]
upstream: veri/review
created: 2026-09-01
updated: 2026-09-02
links:
  - { id: WF-001, rel: derived-from }
  - { id: SRC-060, rel: derived-from }
  - { id: SRC-066, rel: derived-from }
  - { id: REQ-040, rel: serves }
  - { id: REQ-042, rel: constrained-by }
  - { id: DEC-125, rel: constrained-by }
  - { id: DEC-130, rel: constrained-by }
  - { id: REQ-008, rel: constrained-by }
---
## Purpose

The stretch between "the criteria are ticked" and "done" — one look at
the diff by a session that did not write it ([[SRC-066]]). The work
order is already the review policy — In scope, Out of scope,
Acceptance tests, linked decisions — this gate invents no standard of
its own. Its characteristic failure is drift into taste.

## What it reads

- **`get_context(<WO-id>)`, first** — the boundary sections are the
  policy, linked documents in full two hops out (rule 2), receipts
  naming the commits under review.
- **The diff**, through the session's own git and file tools — git is
  the session's act, not a Veri surface ([[DEC-125]]).
- **`run_check()`** — the floor: a violation is a finding before the
  first hunk; `skipped` verbatim — over MCP the git tier never runs,
  so provenance and binds drift are read by hand here.
- **The pending block** — context, never a clause a finding may cite
  ([[REQ-008]]).

## The interview

Five beats that report, two interrupts — a question only where the
spec itself is ambiguous, because that is the record's finding.

1. **Parameters before any finding** — work order, branch or commits,
   whose claim, check verdict with `skipped` verbatim; no work order
   behind the diff → harness review, or rule 1 late: `veri:plan-work`.
2. **The boundary, both directions** — an In-scope item with no hunk
   is undelivered, a hunk no item claims is scope grown silently, Out
   of scope touched is important even as a favour (rule 3).
3. **Evidence every criterion** — met when something observable proves
   it, merely ticked when nothing does; a declared `verify:` run must
   be evidenced in a receipt ([[REQ-042]]). A tick on trust is an
   important finding naming its repairing evidence.
4. **Hunt decisions, both directions** — a choice with no DEC files as
   proposed on the spot (rule 4); a linked decision silently
   contradicted is stop-shaped: code or canon moves, neither by the
   reviewer (rule 2).
5. **Deliver ranked** — verdict per criterion, then **important** (a
   boundary crossed, an unevidenced tick, a smuggled or contradicted
   decision), then **nit**, capped at five, the drop said out loud; a
   finding citing no clause is taste, labelled, never blocking. A
   repeat finding drafts the upstream `AGENTS.md` or method edit for
   the user to apply or decline.
6. **Interrupt — the diff and the order diverged.** The finding is
   about the record: amending a claimed work order is the user's
   edit, or the narrower thing ships and the receipt says so.
7. **Interrupt — "did it work?"** Not answerable from a diff —
   `veri:did-it-work` after shipping, against the declared metric;
   this gate only says whether we built what we said.

## What it files

- **Proposed decisions** (`file_decision`) — `proposed` always,
  alternatives populated, the work order in the *decision's* links
  (`rel: constrains`), never the reverse ([[REQ-008]]).
- **The findings report, in the session** — filed as a source
  (`kind: investigation`) only on the user's ask, never by default.
- **Never a tick, never the flip** — the implementer's close
  ([[MET-001]]), informed by this report, not performed by it.

Mechanical: over MCP `run_check` skips the git tiers (no
subprocesses) — "check passed" and "the commits match the receipts"
are different claims; a terminal `veri check` or this review's own
reading settles the second. `amend_document` refuses claimed work
orders and carries no method edits — beat 6 hands the scope edit
back; the recurrence draft is shown in full, never applied to canon.

## Guardrails

- **Never writes an `approved:` stamp.** Promotion is the user's act,
  always ([[REQ-008]], [[DEC-111]]) — the ticks and the done flip are
  the implementer's close. *"The report informs your done; it never
  performs it."*
- **Against the record, never taste** — a finding cites the clause it
  violates, or is labelled taste and never blocks done.
- **Never fixes what it finds** — a reviewer editing the branch is a
  second implementer on a claim not theirs (rule 8); fixes return
  through `veri:implement`.
- **The nit cap never negotiates upward** — the sixth nit is noise;
  what matters recurs, and recurrence goes upstream.
- **Never widens into general code review** — cite a clause or stay
  quiet.
- **Absence of a violation is not fidelity** — `skipped` named in
  every report, never rounded to green.
- **A missing required tool is a refusal with a named repair** — a
  smuggled decision found without `file_decision` is reasoning lost
  to a transcript.

## Handoff

- **`veri:implement`** — the fixes, same boundary; the new diff read
  when asked.
- **`veri:decide`** — a smuggled product tradeoff, or a deliberate
  contradiction: supersession, never silent deviation.
- **Proposed decisions await the user's stamp** — `veri approve`, or
  the app's review queue.
- **The user's own flip** — the implementer's close follows the
  report; nothing here performs it.
- **`veri:did-it-work`** — after the flip, when the bet's question
  opens: built-what-we-said here, was-it-right there.
