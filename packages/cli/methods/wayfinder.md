---
id: MET-002
type: method
title: "veri:wayfinder — the front door that routes into a gate"
status: accepted
approved: 2026-08-28
description: >-
  Routes an utterance to the gate it belongs to — the front door, standing before every gate rather than at one. Use it when a session opens with a want and no document: "I have an idea for a product", "what should I work on next?", "I need to change something in this codebase", "why is search built this way?". It asks one triage question, then stops asking and shows — the current intent, the queue awaiting dispatch and who holds what, the subgraph around whatever was named, what is approved versus still pending — and hands over to the gate that owns it with the ids already gathered. Not for a question that already names its target and asks for the record: "why does the importer normalise dates in two places, and who decided that?", "what alternatives did we reject when we picked the file-based store?" — those walk the record backwards from a named artifact, no triage needed. Not for ordinary work — "where is the retry logic for the upload queue?", "run the test suite", "good morning" — where no gate is in question at all.
requires: [get_intent, get_queue, list_documents, search, get_neighbors, run_check]
upstream: veri/wayfinder
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

**This method does not staff a gate. It stands in front of all of
them**, owning the moment before any boundary has been identified:
"where am I?" answered from the record, and a handover into the right
gate with the ids already gathered. The only read-only method in the
default set — a front door that could file would file on the
least-informed moment in the loop.

## What it reads

- **`get_intent(<path>)`** when the utterance names code — "nothing
  governs this path" is itself a finding.
- **`get_queue()`** — backlog awaiting dispatch plus held claims (rule
  8): the whole answer to "what should I work on next?".
- **`list_documents({type?, status?})`** — approved versus awaiting the
  stamp; pending hits arrive marked.
- **`search`/`get_neighbors`** for the subgraph around what was named;
  **`run_check()`** for the advisories — omitting them shows a tidier
  project than the one the user is in.
- **The pending block** — pending shown as pending, never as the
  project's position ([[REQ-008]]). All through MCP ([[DEC-125]]).

## The interview

One triage question, three beats of showing, two interrupts when the
front door is asked to be something it is not.

1. **Ask the one triage question** — new idea, change, question about
   the past, or queued work? A second question usually means the answer
   was already given.
2. **Say where the project stands before addressing the utterance** —
   focus, queue head, claims, stamps pending, advisories: users
   routinely change their mind here.
3. **Show the subgraph around what was named, marked by status** — ids,
   not a summary; accepted intent routes toward `veri:define` or
   `veri:plan-work`, an empty area to discovery.
4. **Name the gate, name the skill, hand over** — the ids attached;
   routing is a proposal, and being overridden is a correct outcome.
5. **"Just do it" — interrupt.** Name the missing document before the
   refusal (rule 1): `veri:plan-work` cuts a work order in about the
   length of the conversation.
6. **Not at a gate at all — interrupt and get out of the way.** A
   greeting, a flaky test: no gate is crossed; a front door that opens
   on everything gets uninstalled.

## What it files

**Nothing. This method has no artifact-creating step anywhere in it.**
No `file_*` tool in `requires:`, no beat that writes: what was gathered
travels as ids, and the next skill files under its own discipline. A
session ending here wrote nothing — correct, because nothing was
decided. It never files the routing itself: "we decided to treat this
as a requirements question" is a sentence, not a decision.

## Guardrails

- **Never writes an `approved:` stamp.** Promotion is the user's act,
  always ([[REQ-008]], [[DEC-111]]). This method files nothing at all,
  and the stamp is the one thing it would still be forbidden to write if
  it did.
- **Read-only, with no exception for convenience** — writing the
  requirement is `veri:define`'s act.
- **Never starts implementation** (rule 1) — not even a small commit.
- **Never routes on recall** — every claim about the project is read
  this session.
- **Never presents a pending document as the project's position**
  ([[REQ-008]]).
- **Never opens on a greeting or ordinary work** — the false trigger is
  this method's characteristic failure.
- **A missing required tool is a refusal with a named repair** —
  without the read tools, orientation is recall wearing a citation.
- **Never edits accepted canon**, never resolves a contradiction it
  notices — resolution is `veri:decide`'s.

## Handoff

**No single successor, by construction** — this skill hands off to all
of them and leaves nothing waiting itself.

- **A want with nothing behind it** → `veri:product-discovery`; **one
  the record can argue with** → `veri:define`, ids carried.
- **A fork on the table** → `veri:decide`; **material from outside** →
  `veri:evidence-intake`.
- **Accepted intent, nothing queued** → `veri:plan-work`; **a
  dispatched or claimed work order** → `veri:implement`.
- **A named artifact's rationale** → not a gate but a walk backwards
  from the id, answered in place.
- **The project's condition** → `veri:health`; **a shipped bet** →
  `veri:did-it-work`; the stamp queue is the user's own approval pass
  (`veri approve`, or the app's review queue).
- **Routing failed** → name the two gates it sits between and let the
  user pick; a confident wrong route costs the session.
