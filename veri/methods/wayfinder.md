---
id: MET-002
type: method
title: "veri:wayfinder — the front door that routes into a gate"
status: draft
description: >-
  Routes an utterance to the gate it belongs to — the front door, standing
  before every gate rather than at one. Use it when a session opens with a
  want and no document: "I have an idea for a product", "what should I work
  on next?", "I need to change something in this codebase", "why is search
  built this way?". It asks one triage question, then stops asking and
  shows — the current intent, the ready queue and who holds what, the
  subgraph around whatever was named, what is approved versus still
  pending — and hands over to the gate that owns it with the ids already
  gathered. Not for a question that already names its target and asks for
  the record: "why does the importer normalise dates in two places, and who
  decided that?", "what alternatives did we reject when we picked the
  file-based store?" are veri:archaeology's, because there is a named
  artifact to walk backwards from. Not for ordinary work — "where is the
  retry logic for the upload queue?", "run the test suite", "good morning" —
  where no gate is in question at all.
requires:
  - get_intent
  - get_queue
  - list_documents
  - search
  - get_neighbors
  - run_check
upstream: veri/wayfinder
created: 2026-08-27
updated: 2026-08-27
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

**This method does not staff a gate. It stands in front of all of them.**
Every other method in the library owns one semantic boundary; this one
owns the moment before any boundary has been identified — a user who
knows what is on their mind and not which act it wants.

What the user gets from it: an answer to "where am I?" that is read out
of the record rather than remembered, and a handover into the right gate
with the relevant ids already gathered, so the next skill opens on
context instead of on a blank interview.

It is the only read-only method in the default set, and that is not a
limitation to be worked around. A front door that could file would file
on the strength of one triage question, which is the least-informed
moment in the whole loop. Its licence is to orient and route; everything
else it hands on.

## What it reads

- **`get_intent(<path>)`, when the utterance names code.** What governs a
  file — the work orders whose bindings or receipts touch it and the
  requirements and decisions those cite. It is grounded in what the
  knowledge base records, so unrecorded work does not appear, and saying
  "nothing governs this path" is itself an orientation finding.
- **`get_queue()`.** Ready work orders in dispatch order, plus the
  in-progress claims. This is the whole answer to "what should I work on
  next?" and the reason a held claim is visible before anyone collides
  with it ([[WF-001]] rule 8).
- **`list_documents({type?, status?})`.** What is approved versus what is
  still awaiting the user's stamp. Pending hits arrive marked, and that
  mark is the difference between showing the project's canon and showing
  its slush pile.
- **`search` and `get_neighbors`** over whatever the user actually named,
  for the subgraph around it.
- **`run_check()`.** Advisories are part of where the project stands —
  an untested bet, a stale focus, an abandoned claim. Orientation that
  omits them shows a tidier project than the one the user is in.
- **The pending block, wherever documents arrive.** Drafts and proposals
  are shown as pending and never presented as the project's position
  ([[REQ-008]]).

Everything above goes through the MCP tools ([[DEC-125]]): the skill does
not read `veri/` off disk and does not shell out to the CLI. The two
capabilities [[SRC-060]]'s card listed as wanted rather than had —
document listing and the queue — now exist, so this gate has no
capability gap left to route around.

## The interview

This gate inverts the usual ratio: **one triage question, three beats of
showing, and two interrupts that fire when the front door is asked to be
something it is not.** It asks least and reads most, because the point of
routing is to reach a gate whose own interview can then open properly.

1. **Ask the one triage question.** Unconditional, and the only question
   this method asks:

   > "Is this a new idea, a change to something that exists, a question
   > about the past, or picking up work that is already queued?"

   Each answer selects a different read below and a different destination.
   A second clarifying question is almost always the sign that the answer
   was already given and the skill was not listening.

2. **Say where the project stands, before saying anything about the
   utterance.** Intent, the ready head, the claims held, the count
   awaiting a stamp:

   > "Current focus: <the intent's focus line>. Ready queue: <n> work
   > orders, head is <WO-131>. In progress: <WO-118>, held by <session>.
   > Awaiting your stamp: <n> documents. Advisories: <n>."

   A user who came in for one thing routinely changes their mind here,
   which is the entire value of showing before routing.

3. **Show the subgraph around what was named, marked by status.** The
   requirements, decisions and work orders that already touch this area,
   each labelled accepted/active or pending. Not a summary of them — the
   ids, so the next gate can be handed something concrete:

   > "Search on <the area> reaches [[REQ-040]] (accepted), [[DEC-125]]
   > (active) and two pending drafts. Nothing here has a work order."

   What changes on a different answer: an area with existing accepted
   intent routes to `veri:define` or `veri:plan-work`; an area with
   nothing behind it routes to discovery.

4. **Name the gate, name the skill, hand over.** One sentence each for
   what the gate is and why this utterance is at it, then the handover
   with the ids gathered:

   > "This is the requirements gate: you want a property to hold and no
   > one has written down how it would be observed. `veri:define` staffs
   > it. I'm handing it [[REQ-040]] and [[SRC-060]]. Say if you'd rather
   > start somewhere else."

   Routing is a proposal, not a verdict. The user overriding it is a
   correct outcome and costs nothing.

5. **When the user says "just do it" — interrupt.** The missing document
   is named before the refusal, so the refusal reads as a route rather
   than as an obstacle ([[WF-001]] rule 1):

   > "There's no work order for this, so there is nothing to implement
   > inside. `veri:plan-work` cuts one, and it takes about as long as
   > this conversation. I can hand it what I've already gathered."

6. **When the utterance is not at a gate at all — interrupt, and get out
   of the way.** A null check, a rename, a flaky test, a greeting:

   > "That's ordinary work inside intent that already exists — no gate is
   > being crossed. Go ahead; I'll stay out of it."

   A front door that opens on everything is a nuisance, and a nuisance
   gets uninstalled. Saying nothing fired is a real answer here.

## What it files

**Nothing. This method has no artifact-creating step anywhere in it.**

There is no `file_*` tool in its `requires:` list, no beat above produces
a document, and no branch of the routing ends in a write. Orientation
that files is orientation that has committed the user to a shape before
the gate that owns that shape has asked its first question.

Two consequences worth stating outright:

- **A conversation this method had is not on the record**, and it should
  not pretend otherwise. What was gathered is handed to the next skill as
  ids and context, and that skill files under its own discipline. If the
  session ends here, nothing was written — which is correct, because
  nothing was decided.
- **It never proposes the routing itself as a document.** "We decided to
  treat this as a requirements question" is not a decision; it is a
  sentence in a conversation, and filing it would put noise in a graph
  this library exists to keep clean.

## Guardrails

Every refusal names what is missing and what would fix it. A skill that
cannot file what it collected refuses rather than degrading ([[DEC-125]]);
this one collects nothing, so its equivalent failure is routing on a
guess it never checked.

- **Never writes an `approved:` stamp.** Promotion is the user's act,
  always ([[REQ-008]], [[DEC-111]]). This method files nothing at all,
  and the stamp is the one thing it would still be forbidden to write if
  it did.
- **Read-only, with no exception for convenience.** *"I can see this
  wants a requirement, but writing one is `veri:define`'s act, not mine —
  it asks the questions I'd be guessing at."*
- **Never starts implementation** ([[WF-001]] rule 1). Not a first
  commit, not a small one, not "while we're here".
- **Never routes on recall.** Every claim about where the project stands
  is read this session. *"I haven't looked yet — give me the queue and
  the neighbours before I point you anywhere."*
- **Never presents a pending document as the project's position**
  ([[REQ-008]]). A draft shown unmarked is worse than one not shown: it
  routes the user into work built on something nobody approved.
- **Never opens on a greeting or on ordinary work.** Beat 6 is a
  guardrail as much as a beat — the false trigger is this method's
  characteristic failure, not the missed one.
- **A missing required tool is a refusal with a named repair.** Without
  `get_queue` there is no answer to "what should I work on next?";
  without `list_documents` the pending set is invisible; without
  `get_intent`, `search` or `get_neighbors` the orientation is recall
  wearing a citation. Name the absent tool and stop.
- **Never edits accepted canon**, and never resolves a contradiction it
  notices between two documents. Noticing is useful; the resolution is a
  decision, and `veri:decide` owns it.

## Handoff

**This method has no single successor, by construction.** It is the one
skill that hands off to all of them, and a version of it that named one
next gate would have stopped being a front door. Each exit below names
the condition, the destination, and what travels with the handover; what
awaits an act is whatever the destination gate files, because this one
leaves nothing waiting.

- **A want with no problem behind it** → `veri:product-discovery`, with
  whatever prior sources and intent were found. The condition is an empty
  or near-empty record in the area named.
- **A want the record can already argue with** → `veri:define`, carrying
  the accepted requirements and the evidence found in beat 3. The
  requirement it drafts then awaits the user's stamp.
- **A fork already on the table** → `veri:decide`, carrying the
  requirements the choice must serve and the active decisions it must not
  contradict.
- **Material arriving from outside** → `veri:evidence-intake`, carrying
  the requirements the search says it plausibly bears on.
- **Accepted intent with nothing queued against it** → `veri:plan-work`;
  **a ready or claimed work order** → `veri:implement`, with the id and
  the claim state already read.
- **A named artifact whose rationale is being asked for** →
  `veri:archaeology`, which walks the record backwards. The line this
  method holds is that a why-question with no target is an entry point,
  not a request for history.
- **A question about the project's condition rather than its content** →
  `veri:health` for decay, `veri:approval-session` for the stamp queue,
  `veri:did-it-work` for a bet whose work has shipped.

And when routing fails: say so plainly, name the two gates it sits
between, and let the user pick. A wrong route costs the next skill's
first question; a confident wrong route costs the session.
