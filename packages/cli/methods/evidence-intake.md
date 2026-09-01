---
id: MET-004
type: method
title: "veri:evidence-intake — the evidence door, staffed"
status: accepted
approved: 2026-09-01
description: >-
  Staffs the evidence door: takes material arriving from outside — user feedback, metrics, a support ticket, a competitor move, an incident, research findings — and files it as a source linked to what it bears on, so it lands on the graph instead of in a drawer. Use it when something external is pointed at the record: "here is a support thread where three customers hit the same import failure, get it on the record against whatever it bears on", "last month's activation numbers came back for the onboarding release, file them", "a competitor just shipped the thing REQ-021 bets against, where does that go?". It files the material faithfully, with tests, supports or refutes links to the requirements and outcome-of links to the shipping work orders, and leaves what it means to you. Not for judging a bet whose evidence is already in: "did the caching work actually move p95 latency to the target REQ-028 declared?", "all of REQ-035's work orders are done, was the bet right or do we retire it?" are veri:did-it-work's, which needs the filing first. Not for "thanks, that worked", or anything carrying no observation.
requires: [file_source, search, get_neighbors, get_import_instructions, run_check]
upstream: veri/evidence-intake
created: 2026-08-27
updated: 2026-09-01
links:
  - { id: WF-001, rel: derived-from }
  - { id: SRC-060, rel: derived-from }
  - { id: REQ-040, rel: serves }
  - { id: REQ-033, rel: constrained-by }
  - { id: REQ-038, rel: constrained-by }
  - { id: DEC-113, rel: constrained-by }
  - { id: DEC-125, rel: constrained-by }
  - { id: DEC-130, rel: constrained-by }
  - { id: REQ-008, rel: constrained-by }
---
## Purpose

**This method does not occupy a stage of the loop. It feeds all of
them** — evidence arrives whenever reality feels like arriving. It
closes [[WF-001]]'s loop, which has only ever run hand-filed here
([[SRC-062]]): the filing step is the point, and a session that
discussed evidence beautifully and filed nothing has failed. An edge
written backwards is not a smaller right edge; it is a no-op
([[DEC-113]]).

## What it reads

- **The material itself, first and in full** — the search terms come
  out of it.
- **`search`/`get_neighbors`** for what it *plausibly* bears on — which
  one it actually bears on is the user's question.
- **`get_import_instructions()`** — filing rules, link relations,
  source template: the output is one document with correct edges.
- **`run_check()`** before (what is waiting) and after (did the edge
  land); **the pending block** — a draft is never filed against as
  settled ([[REQ-008]]). All through MCP ([[DEC-125]]).

## The interview

Four beats ending in a filed source, two interrupts — interpretation
folded in, and no evidence at all. Each answer determines an edge.

1. **Say what the material is, and classify it** — the source's `kind`
   ([[REQ-038]]); unclassified defaults to `reference`, the shrug.
2. **Name what it plausibly bears on, ask which relation** — *tests*,
   *supports* or *refutes* is the user's pick (rule 9).
3. **One observation or a pattern?** A single instance filed as a trend
   is how a record starts lying; a single instance still files.
4. **Does it answer a bet that already shipped?** Both edges — outcome
   rel to the requirement, `outcome-of` to the work order — then file,
   `run_check`, and report the advisory count before and after: the
   clearing is the only proof the edges landed the right way round.
5. **Interrupt — interpretation folded into the source.** "So we should
   retire it" is a reading; it stays in the conversation so the
   evidence can be re-read by someone who disagrees.
6. **Interrupt — not evidence.** No measurement, user, incident or
   date: nothing to file. "Tell me what you saw and I'll file that."

## What it files

- **Source documents** (`file_source`) — the material faithfully
  reproduced or excerpted with provenance (where, when, who), `kind`
  from [[REQ-038]], and the links beats 2 and 4 established. Sources
  carry no approval gate; they must carry correct edges.
- **Nothing else** — revised requirements, decisions and work orders
  are judgments with their own gates.

The link discipline, in full because getting it wrong is a check
violation ([[DEC-113]]): from a source, `tests`/`supports`/`refutes`
must target a *requirement* and `outcome-of` a *work order* — anything
else is `invalid-outcome-link`, and the backwards edge is flagged
wherever it appears; on other document types the same words stay free
text. Both edges or neither: the untested-bet advisory clears only for
a hypothesis whose linked work orders are all done and which a source
links with an outcome rel — a misdirected edge silently fails to count.
A correct edge pays out at once: context assembly promotes outcome
sources into the requirement's core ring.

## Guardrails

- **Never writes an `approved:` stamp.** Promotion is the user's act,
  always ([[REQ-008]], [[DEC-111]]). Evidence never promotes, retires or
  revises anything on its own arrival — [[WF-001]] rule 9, and the reason
  this gate can afford to file freely.
- **Files faithfully; interprets out loud** — meaning goes in the
  conversation, not the document.
- **Never guesses between supports and refutes** — exactly the judgment
  it is not licensed to make.
- **Never files one observation as a pattern**, never an inference in
  the voice of an observation.
- **Never files the same evidence twice** — `search` first; a duplicate
  splits the weight across two ids.
- **Never leaves a filed source unverified** — `run_check` after,
  `skipped` verbatim.
- **A missing required tool is a refusal with a named repair** —
  without `file_source` the evidence ends the session still in a chat
  log.

## Handoff

**No single successor, by construction** — the exit follows what the
evidence bears on.

- **`veri:did-it-work`** — evidence answering a shipped bet: the exit
  that closes the loop.
- **`veri:define`** — evidence demanding revised intent; revising
  accepted intent stays the user's act.
- **`veri:decide`** — a choice reopened: supersession, never a silent
  edit.
- **`veri:health`** — one instance of a pattern of decay.
- **Nowhere at all — the most common exit, and legitimate**: filed, on
  the graph, riding in the requirement's context package. Say so rather
  than invent a successor.
