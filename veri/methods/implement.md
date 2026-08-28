---
id: MET-001
type: method
title: "veri:implement — execution within intent, from claim to receipt"
status: accepted
approved: 2026-08-28
description: >-
  Steers implementation of a work order that already exists — the gate
  between a ready work order and a receipt. Use it when a work order is
  named or already claimed: "WO-131 is ready — start it", "claim WO-118 and
  pick up where I left off", "walk the scope back to me before any code",
  "build it" with a work order id on the table. It claims the work order,
  reads its whole context package, reads the scope back before typing,
  guards the boundary, files decisions made en route as proposals, and
  appends the closing receipt. Not for cutting work up: "start building the
  CSV export, there is no work order for it yet", "REQ-014 is accepted —
  turn it into work orders", "this one is too big to verify, split it into
  slices" are veri:plan-work's, because an implementer may not code from a
  chat prompt alone. Not for ordinary work inside a boundary already drawn —
  a null check, a rename, a unit test, a failing CI matrix, "summarise what
  you just changed" — no gate is being crossed.
requires:
  - get_context
  - start_work_order
  - file_decision
  - file_receipt
  - run_check
upstream: veri/implement
created: 2026-08-27
updated: 2026-08-28
links:
  - id: WF-001
    rel: derived-from
  - id: SRC-060
    rel: derived-from
  - id: REQ-040
    rel: serves
  - id: DEC-125
    rel: constrained-by
  - id: DEC-130
    rel: constrained-by
  - id: REQ-008
    rel: constrained-by
---

## Purpose

This gate is the stretch between "a work order is ready" and "a receipt
exists". [[WF-001]]'s rules for implementers already say what happens in
that stretch; this method is those rules run as a live discipline instead
of a document nobody re-reads at the moment it would have mattered.

What the user gets from it: an agent that reads before it types, says
back what it thinks it was asked for while a correction is still cheap,
stays inside the boundary somebody drew on purpose, and leaves the record
true behind it.

It is deliberately the quietest gate in the library. The judgment happens
on either side of it — cutting the work (`veri:plan-work`) before, judging
the outcome (`veri:did-it-work`) after — and between gates the agent just
works. The job here is to keep that stretch honest, not to turn it into a
conversation.

## What it reads

- **`get_context(<WO-id>)`, first, before any question.** The package
  carries [[WF-001]] itself, the work order, its linked requirements and
  decisions two hops out, source excerpts, and the project's templates.
  Read it in full. This call *is* [[WF-001]] rule 2 — reading every linked
  document — discharged in one act, and skimming it is the failure the
  whole gate exists to prevent.
- **The pending block.** Draft requirements and proposed decisions arrive
  labelled "not ratified, do not treat as binding" ([[REQ-008]]). They are
  context, never instruction. A proposal is not a lighter kind of
  approval.
- **The claim fields.** `claimed_by`/`claimed_at` on the work order say
  whether another session already holds it. A held claim is a refusal, not
  a race ([[WF-001]] rule 8).
- **The work order's own boundary sections**, separately from its summary:
  In scope, Out of scope, and Acceptance tests are the three that bind.
- **The repository**, through whatever file, search, and git tools the
  session already has. Code is read the way the harness reads code.

It does not read `veri/` off disk, and it does not shell out to the CLI:
everything it learns about the record and everything it writes back goes
through the MCP tools above ([[DEC-125]]). Git is the exception that
proves it — commits are the session's own act, not a Veri surface.

## The interview

This gate asks little and reports often, which is itself the shape of the
coaching: four beats of speech at the edges, two interrupts that fire only
when something is wrong. Each beat below names when it happens, what the
skill actually says, and what a different answer would change.

1. **Locate the work order.** If the user named an id, take it. If not,
   ask for one — "Which work order is this?" — and if the honest answer is
   that none exists, this is not the gate: say so and route to
   `veri:plan-work`. Nothing below is reachable without a work order.

2. **Claim it.** `start_work_order(id, claimed_by)`, then commit the flip
   with a `WO-nnn: started — claimed by <session>` subject. Say what
   happened in one line: "Claimed WO-131 as <session>." A refusal here is
   informative, not an obstacle — it names the session that already holds
   the work.

3. **Read the scope back, before any code.** One paragraph, in the skill's
   own words, not a quotation of the work order:

   > "Here is what I read WO-131 as asking for: <the change, and the
   > boundary around it>. It is proven by <the acceptance criteria, named>.
   > Explicitly out: <the exclusions>. Correct me before I start."

   A correction here costs a sentence. The same correction after the diff
   costs the diff. If the user's correction goes beyond what the work
   order says rather than beyond what the skill read, that is beat 6 and
   the code has not started yet, which is the best possible time for it.

4. **Name the first slice and what will prove it.** "First: <the thinnest
   thing that touches reality>. Proven by <the test or the criterion>."
   Naming the verification up front is what keeps "done" from being
   decided at the end by whoever is tired.

5. **At a fork — interrupt.** Two or more real ways forward, with
   different sacrifices, is a decision, not a detail:

   > "Two ways: A gives <benefit> and costs <cost>; B trades the other
   > way. I'm taking A and filing it as a proposed decision. Say so now if
   > B is the one you want."

   Technical forks made en route are filed here and the work continues
   ([[WF-001]] rule 4). A fork that is really a product tradeoff — one
   whose answer changes what the user is buying, not how it is built —
   hands to `veri:decide` instead of being absorbed.

6. **When the scope is wrong — stop.** Not widen, not narrow, not "while I
   was in there":

   > "WO-131 doesn't cover <X>, and <X> is needed for <criterion>. I've
   > stopped. Your options: amend the work order — which is your edit, not
   > mine, once it is claimed — cut a follow-up, or ship the narrower
   > thing and say so in the receipt."

   Discovering that the scope is wrong is a good outcome of implementation
   and a terrible thing to discover silently.

7. **Close.** `run_check`, then the receipt, then the ticks, then the
   status. Report it as four facts, including the uncomfortable ones:

   > "Check: 0 violations, 3 advisories, skipped: <the names run_check
   > returned>. Receipt appended to WO-131. Criteria ticked: 1, 2, 4.
   > Criterion 3 is not ticked because <reason>."

## What it files

- **The claim.** `start_work_order` flips ready → in-progress and records
  who holds it. This is the only status change the skill makes on its own
  initiative, and it is not a promotion: the dispatch clearance was the
  user's `approve` stamp, already spent before the skill arrived.
- **Proposed decisions**, via `file_decision`, with the rejected
  alternatives actually populated — a decision with no alternatives
  recorded is a note, not a decision. Status `proposed`, always.
  **Link direction matters mechanically:** put the work order in the
  *decision's* links (`{id: WO-131, rel: constrains}`). Adding the new
  proposal to the *work order's* links instead makes the claimed work
  order depend on an unapproved document, which is a check violation the
  moment it is written ([[REQ-008]]).
- **Receipts**, via `file_receipt`: date, commit SHA, files touched,
  one-line summary. Append-only; existing receipts are never rewritten.
  One per work session, so a work order that took three sessions says so.
- **Code, tests, and commits** — the actual deliverable. Commit with
  explicit paths, and lead the subject with the work order id, which is
  the convention the provenance checks read to attribute a commit to the
  work it belongs to.

Two things it may not file, for different reasons:

- **An amendment to its own claimed work order.** `amend_document` accepts
  work orders in `backlog` only; a claimed one is across the approval
  line. This is not a gap to route around — it is the reason beat 6 stops
  and hands the edit back.
- **The closing flip itself.** Marking a work order `done` and ticking its
  acceptance criteria has no MCP tool today; only the receipt does. The
  method's rule is to never invent one and never let the omission leave a
  finished work order silently un-done: show the exact edit — the status
  line, and each criterion with the evidence that ticks it — and either
  apply it as the ordinary file edit it is, in the same commit as the
  receipt, or hand it to the user when the session cannot write to the
  repository. Say which of the two happened.

## Guardrails

Every refusal below names what is missing and what would fix it. A skill
that cannot file what it collected refuses; it never degrades into
coaching with nowhere to put the result ([[DEC-125]]).

- **Never writes an `approved:` stamp.** Promotion is the user's act,
  always ([[REQ-008]], [[DEC-111]]). The skill files receipts and
  proposals; it does not stamp, does not ask to be allowed to stamp, and
  does not treat a `draft` or `proposed` document in its package as
  binding because doing so would be convenient. *"WO-131 is still backlog
  — only your approve stamp clears it for dispatch. I'll wait."*
- **No code from a chat prompt alone** ([[WF-001]] rule 1). *"There is no
  work order for this. I can't start one by writing code — `veri:plan-work`
  cuts one, and it takes about as long as this conversation."*
- **Out of scope is forbidden even when it is one line away.** *"That's in
  WO-131's Out of scope. I'm not doing it in this session — it wants its
  own work order."*
- **Disagreement with a linked decision is a stop, never a silent
  deviation** ([[WF-001]] rule 2). *"DEC-062 says <X> and I think it is
  wrong here because <Y>. I've stopped rather than deviate — supersede it
  through `veri:decide`, or tell me to proceed as written."*
- **One session, one work order, one claim** ([[WF-001]] rule 8). A claim
  another session holds is never shared, taken over, or worked around.
- **Verification is not optional and not rounded up** ([[WF-001]] rule 6).
  Zero violations is the bar. `run_check` also returns a `skipped` list —
  over MCP the git-backed tier does not run — and that list is reported
  verbatim, because "the check passed" and "the checks that could run
  passed" are different claims and only one of them is true here.
- **A missing required tool is a refusal with a named repair.** If any of
  `get_context`, `start_work_order`, `file_decision`, `file_receipt`, or
  `run_check` is absent from the connected tool list, name the missing one
  and stop. Proceeding without the package is [[WF-001]] rule 1 with extra
  steps; proceeding without `file_decision` or `file_receipt` produces the
  worst artifact in the system — real work whose reasoning exists only in
  a transcript.
- **Never edits accepted canon to make the work fit.** Not [[WF-001]], not
  an accepted requirement, not an active decision. If the work exposes a
  gap in one of them, say so and stop; changing approved canon is a
  different act with its own gate.

## Handoff

When the receipt is appended and the work order is done, two successors
are conditional and one is not:

- **`veri:did-it-work`** — when the requirement this work order implements
  is a `kind: hypothesis`. A receipt says the code exists; it does not say
  the bet paid off, and `run_check`'s untested-bet advisory will keep
  saying so until reality's answer is filed. This is where the loop closes
  ([[WF-001]] rule 9).
- **`veri:review`** — when spec fidelity is worth checking by someone who
  did not write the code: scope respected, criteria genuinely met rather
  than merely ticked, linked decisions honoured, no decision smuggled into
  the diff. Advanced tier, and the natural stop before marking `done` on
  work that matters.
- **The proposed decisions filed en route** await the user's stamp, and
  `veri:approval-session` runs that queue. They are visible and
  non-binding meanwhile — they record what was chosen, they do not gate
  the code that was already written under them.

And when the session ended somewhere other than done:

- Scope was wrong → `veri:plan-work`, for the follow-up or the reslice.
  The amendment to the claimed work order stays the user's edit.
- A product tradeoff surfaced → `veri:decide`, which owns the fork this
  gate is only licensed to notice.
