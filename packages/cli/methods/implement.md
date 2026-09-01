---
id: MET-001
type: method
title: "veri:implement — execution within intent, from claim to receipt"
status: accepted
approved: 2026-08-28
description: >-
  Steers implementation of a work order that already exists — the gate between a ready work order and a receipt. Use it when a work order is named or already claimed: "WO-131 is ready — start it", "claim WO-118 and pick up where I left off", "walk the scope back to me before any code", "build it" with a work order id on the table. It claims the work order, reads its whole context package, reads the scope back before typing, guards the boundary, files decisions made en route as proposals, and appends the closing receipt. Not for cutting work up: "start building the CSV export, there is no work order for it yet", "REQ-014 is accepted — turn it into work orders", "this one is too big to verify, split it into slices" are veri:plan-work's, because an implementer may not code from a chat prompt alone. Not for ordinary work inside a boundary already drawn — a null check, a rename, a unit test, a failing CI matrix, "summarise what you just changed" — no gate is being crossed.
requires: [get_context, get_queue, file_decision, file_receipt, run_check]
upstream: veri/implement
created: 2026-08-27
updated: 2026-09-01
links:
  - { id: WF-001, rel: derived-from }
  - { id: SRC-060, rel: derived-from }
  - { id: REQ-040, rel: serves }
  - { id: DEC-125, rel: constrained-by }
  - { id: DEC-130, rel: constrained-by }
  - { id: REQ-008, rel: constrained-by }
---
## Purpose

The stretch between "a work order is ready" and "a receipt exists" —
[[WF-001]]'s implementer rules run as a live discipline. The quietest
gate in the library: judgment sits on either side (`veri:plan-work`
before, `veri:did-it-work` after); this gate keeps the stretch honest.

## What it reads

- **`get_context(<WO-id>)`, first, in full** — [[WF-001]], the work
  order, every linked document: rule 2 in one act. Skimming it is the
  failure this gate exists to prevent.
- **The pending block** (never binding, [[REQ-008]]), **the claim
  fields** (a held claim is a refusal, not a race — rule 8), and **the
  boundary sections**: In scope, Out of scope, Acceptance tests bind.
- **The repository**, with the session's own tools; the record only
  through MCP ([[DEC-125]]) — git alone is the session's act.

## The interview

Four beats of speech at the edges, two interrupts that fire only when
something is wrong.

1. **Locate the work order** — none exists → route to `veri:plan-work`.
2. **Confirm the dispatch** — `veri dispatch <WO-id> --as <session>`,
   the user's one gesture ([[DEC-143]]), a carried stamp spent, never
   re-dated; no MCP tool dispatches: ask, read the claim back from
   `get_queue`, commit the flip ("WO-131: started — claimed by …").
3. **Read the scope back before any code** — change, boundary, proving
   criteria, exclusions, in the skill's own words: a correction here
   costs a sentence; after the diff, the diff.
4. **Name the first slice and its proof** — so "done" is not decided at
   the end by whoever is tired.
5. **At a fork — interrupt.** Name both ways, take one, file the
   proposed decision, continue (rule 4); a fork in what the user is
   buying goes to `veri:decide`.
6. **When the scope is wrong — stop.** The user amends (a claimed work
   order is their edit), a follow-up is cut, or the narrower thing
   ships and the receipt says so.
7. **Close.** `verify:` first when declared ([[REQ-042]]) — run by the
   session's harness, never Veri ([[DEC-037]]), exit 0 before the
   receipt, outcome inside the receipt's sentence ([[DEC-142]]) — then
   `run_check`, receipt, ticks, status: facts, `skipped` verbatim.

## What it files

- **The claim commit** — the flip itself is the user's dispatch.
- **Proposed decisions** (`file_decision`) — rejected alternatives
  populated, `proposed` always. The work order goes in the *decision's*
  links (`{id: WO-131, rel: constrains}`); the reverse makes a claimed
  work order depend on an unapproved document, a check violation
  ([[REQ-008]]).
- **Receipts** (`file_receipt`) — date, SHA, files, one line;
  append-only, one per session, the verify outcome inside the line.
- **Code and commits** — explicit paths, subject led by the WO id.

Never filed: an amendment to its own claimed work order
(`amend_document` accepts `backlog` work orders only — beat 6 hands the
edit back), and the closing flip (status plus ticks), which has no MCP
tool: show the exact edit, apply it in the receipt's commit or hand it
to the user, and say which happened.

## Guardrails

- **Never writes an `approved:` stamp.** Promotion is the user's act,
  always ([[REQ-008]], [[DEC-111]]). The skill files receipts and
  proposals; it does not stamp, does not ask to be allowed to stamp, and
  does not treat a `draft` or `proposed` document in its package as
  binding because doing so would be convenient. *"WO-131 is still backlog
  — only your approve stamp clears it for dispatch. I'll wait."*
- **No code from a chat prompt alone** (rule 1).
- **Out of scope is forbidden even one line away.**
- **Disagreement with a linked decision is a stop, never a silent
  deviation** (rule 2).
- **One session, one work order, one claim** (rule 8).
- **Verification is not optional and not rounded up** (rule 6): zero
  violations, `skipped` reported verbatim — "the check passed" and "the
  checks that could run passed" are different claims.
- **A missing required tool is a refusal with a named repair.**
- **Never edits accepted canon to make the work fit** — say so, stop.

## Handoff

- **`veri:did-it-work`** — the requirement was a hypothesis; a receipt
  does not settle the bet (rule 9).
- **`veri:review`** ([[MET-010]]) — spec fidelity read by someone who
  did not write the code, before `done` on work that matters.
- **Proposed decisions await the user's stamp** — `veri approve`, or
  the app's review queue.
- Scope wrong → `veri:plan-work` (the amendment stays the user's
  edit); a product tradeoff → `veri:decide`.
