---
id: MET-010
type: method
title: "veri:review — spec fidelity of the diff, read against the work order before done"
status: accepted
approved: 2026-09-01
description: >-
  The pre-done gate: the branch diff read against the work order that
  produced it, by a session that did not write it. Use it before done:
  "go through the diff on the wo-118 branch against its
  work order before I mark it done", "WO-124's acceptance criteria are
  all ticked — check whether we actually did what we said", "read the
  last five receipts and tell me whether any of them smuggled a decision
  into code without a DEC". It reports rather than asks — every in-scope
  item delivered, nothing out-of-scope touched, every criterion
  genuinely evidenced, no linked decision silently contradicted —
  findings ranked important/nit, nits capped at five, each citing the
  clause it violates. Not for judging what shipped against its declared
  outcome: "did the caching work actually move p95 latency to the target
  REQ-028 declared?", "we shipped the onboarding rewrite six weeks ago —
  did it actually help activation?" are veri:did-it-work's, because
  those need reality's answer, not the diff. Not for general code review
  with no work order behind the diff — the harness's own tooling — nor
  for "run the test suite", "summarise what you just changed".
requires:
  - get_context
  - run_check
  - file_decision
upstream: veri/review
created: 2026-09-01
updated: 2026-09-01
links:
  - id: WF-001
    rel: derived-from
  - id: SRC-060
    rel: derived-from
  - id: SRC-066
    rel: derived-from
  - id: REQ-040
    rel: serves
  - id: REQ-042
    rel: constrained-by
  - id: DEC-125
    rel: constrained-by
  - id: DEC-130
    rel: constrained-by
  - id: REQ-008
    rel: constrained-by
---

## Purpose

This gate is the stretch between "the criteria are ticked" and "the work
order is done" — one look at the diff by a session that did not write
it. [[SRC-066]] found it declared in the trigger corpus, named as a
handoff by [[MET-001]] and [[MET-008]], and never written: the record
routed to a gate nobody staffed, and every acceptance box in the record
was ticked on the implementer's own word.

What the user gets from it is cheap distrust at the right moment. The
work order is already a machine-readable review policy — In scope, Out
of scope, Acceptance tests, linked decisions — so this gate invents no
standard of its own: it reads the diff against the policy somebody
approved, and reports where they disagree. Its characteristic failure is
drift into taste: a reviewer with opinions about code will always find
some, and every one of them dilutes the four questions this gate exists
to answer.

## What it reads

- **`get_context(<WO-id>)`, first.** The work order's boundary sections
  are the review policy: In scope is the checklist of what the diff must
  deliver, Out of scope what it must not touch, Acceptance tests what
  needs evidence — and the linked requirements and decisions arrive in
  full, two hops out ([[WF-001]] rule 2, read from the reviewer's
  chair). The receipts ride in the work order's body: which commits the
  implementer says are the work.
- **The diff itself, through the session's own git and file tools.** The
  branch against its mainline, plus the commits the receipts point at.
  Git is the session's own act, not a Veri surface ([[DEC-125]]) — the
  same exception [[MET-001]] states from the implementer's side.
- **`run_check()`** — the mechanical floor before any judgment: a
  violation is a finding before the first hunk is read. Its `skipped`
  list is reported verbatim; over MCP the git-backed tier does not run,
  so provenance and binds drift are precisely what this review must read
  by hand.
- **The pending block, labelled non-binding** ([[REQ-008]]). A draft
  requirement is context for what the diff was aiming at, never a clause
  a finding may cite.

## The interview

**This gate barely asks: five beats that report, two interrupts.** A
finding is framed as a question only where the spec itself is ambiguous
— "the work order says 'fast'; the code caches; was that the intent?" —
because an ambiguous clause is the record's finding, not the code's.

1. **State the review's parameters before any finding.** Which work
   order, which branch or commits, whose claim, and the check verdict
   with its skipped list verbatim:

   > "Reviewing WO-118: the wo-118 branch, four commits, against its
   > work order and three linked decisions. Check: 0 violations, 2
   > advisories, skipped: <the list run_check returned>. The git tier
   > did not run — provenance I read by hand."

   If no work order stands behind the diff, this is not the gate:
   general code review belongs to the harness's own tooling, and real
   work with no work order at all is [[WF-001]] rule 1 surfacing late —
   say so and route to `veri:plan-work`.

2. **Walk the boundary in both directions.** Every In-scope item found
   in the diff — named file, named hunk — and every hunk of the diff
   claimed by some in-scope item. An in-scope item with no hunk behind
   it is undelivered; a hunk no item claims is scope grown silently; and
   Out of scope touched is an important finding even when the touch
   looks like a favour ([[WF-001]] rule 3).

3. **Evidence every acceptance criterion, one at a time.** A criterion
   is met when something observable proves it — the test that exercises
   it, the command that exits 0, the file that now says what the
   criterion demands — and merely ticked when nothing does. Where the
   work order declares `verify:`, its run must be evidenced in a receipt
   ([[REQ-042]]). A tick standing on trust is an important finding that
   names the evidence which would repair it.

4. **Hunt decisions, in both directions.** A non-trivial choice visible
   in the diff — a library, a schema shape, an algorithm — with no
   decision on the record ([[WF-001]] rule 4) is filed as a proposed
   decision on the spot, alternatives populated. A linked decision the
   diff silently contradicts ([[WF-001]] rule 2) is a stop-shaped
   finding: the code or the canon must move, and neither is the
   reviewer's to move.

5. **Deliver the report, ranked.** Verdict per criterion first, then
   findings: **important** — a boundary crossed, a criterion without
   evidence, a decision smuggled or contradicted — then **nit**, capped
   at five, the remainder dropped and the drop said out loud. Every
   finding cites the clause it violates — the in-scope item, the
   criterion, the DEC; a finding that can cite nothing is taste,
   labelled taste, and never blocks done. A finding this gate has made
   before — same kind, an earlier review or receipt — proposes the fix
   upstream: the exact `AGENTS.md` or method edit that would stop the
   recurrence, shown as a draft for the user to apply or decline, so the
   knowledge compounds instead of repeating.

6. **Interrupt — the work order and the diff diverged for a reason.**
   When the diff needed something In scope never granted, the finding is
   about the record, not the code:

   > "The diff touches <the ungranted thing>; WO-118 never grants it,
   > and criterion 3 needs it. Either the work was too wide or the order
   > was too narrow. Amending a claimed work order is your edit — or
   > ship the narrower thing and let the receipt say so."

7. **Interrupt — asked whether it worked.** "Did it help activation?" is
   not answerable from a diff:

   > "That is the outcome question — `veri:did-it-work`, after shipping,
   > against the metric the requirement declared. This review can only
   > say whether we built what we said."

## What it files

- **Proposed decisions, via `file_decision`** — one per choice found in
  the code but absent from the record. Status `proposed`, always;
  rejected alternatives actually populated; the work order in the
  *decision's* links (`rel: constrains`), never the reverse — a claimed
  work order linking an unapproved document fails the gate check
  ([[REQ-008]]).
- **The findings report, delivered in the session** — parameters,
  per-criterion verdicts, findings ranked important/nit with the cap
  applied. It is addressed to the user standing at the done flip, and it
  becomes durable through what it found: the proposed decisions above
  and the recurrence proposal below. When the user wants the review
  itself kept, it files as a source (`kind: investigation`) linked to
  the work order it read — on their ask, not by default; the record's
  volume is a finding [[SRC-066]] already made once.
- **The recurrence proposal, as a draft the user applies.** The exact
  `AGENTS.md` or method edit, shown in full. `amend_document` cannot
  carry it — it accepts draft requirements, proposed decisions, and
  backlog work orders only, and a method document is none of those — so
  the proposal is handed over as the edit itself, never applied to canon
  by this gate.

Two things it never files: a tick — the acceptance boxes belong to the
implementer's close ([[MET-001]]) — and the done flip, which is the very
judgment this report exists to inform.

**Two mechanical facts, verified against `packages/mcp/src/server.ts`
and `packages/core/src/check.ts` on 2026-09-01:** `run_check` over MCP
returns a `skipped` list because the server spawns no subprocesses — the
git-backed provenance and binds tiers never run there, so "check passed"
and "the commits match what the receipts claim" are different claims,
and only a terminal `veri check` or this review's own reading settles
the second. And `amend_document` refuses claimed work orders, which is
why beat 6 hands the edit back instead of routing around it.

## Guardrails

Every refusal names what is missing and what would fix it; a skill that
cannot file what it found refuses rather than degrading ([[DEC-125]]).

- **Reviews against the record, never the reviewer's taste.** A finding
  must cite the clause it violates — an in-scope item, a criterion, a
  linked decision. *"I can't make that a finding: no clause in WO-118 or
  its links asks for it. Labelled taste, not counted, and it doesn't
  block done."*
- **Never ticks a criterion, never flips a status, never writes an
  `approved:` stamp.** Promotion is the user's act, always ([[REQ-008]],
  [[DEC-111]]); the ticks and the done flip are the implementer's close,
  informed by this report and not performed by it.
- **Never fixes what it finds.** A reviewer who edits the branch has
  become a second implementer on a claim that is not theirs ([[WF-001]]
  rule 8), and the next review would be reading its own work. Fixes go
  back through `veri:implement`.
- **Nits are capped at five, and the cap does not negotiate upward.**
  The sixth nit is noise wearing a finding's badge; if it matters it
  will recur, and recurrence is what the upstream proposal is for.
- **Never widens into general code review.** Style, performance
  opportunities, refactoring beyond the boundary — the harness has its
  own tooling for that; this gate cites clauses or stays quiet.
- **Absence of a violation is not a verdict of fidelity.** A passing
  `run_check` means the checks that could run passed; the skipped list
  is named in every report, never rounded up to green.
- **A missing required tool is a refusal with a named repair.** Without
  `get_context` there is no policy to review against; without
  `file_decision`, a smuggled decision is found and then lost — the
  worst artifact in the system, reasoning that exists only in a
  transcript.

## Handoff

The report's findings each exit somewhere; the flip itself stays with
the user.

- **`veri:implement`** — for the fixes. The findings name the clauses;
  the claimed session repairs inside the same boundary, and this gate
  reads the new diff when asked.
- **`veri:decide`** — for a smuggled choice that turned out to be a
  product tradeoff rather than a technical one, and for a linked
  decision the diff contradicts on purpose: supersession, never a
  silent deviation.
- **The proposed decisions filed en route** await the user's stamp —
  `veri approve`, or the app's review queue.
- **The user's own flip** — a clean report, or one whose findings they
  accept, is followed by the implementer's close ([[MET-001]]): the
  receipt, the ticks, the status. Nothing here performs any of it.
- **`veri:did-it-work`** — after the flip, when the requirement behind
  the work order is a bet. Whether we built what we said is this gate's
  whole question; whether what we said was right is that one's.
