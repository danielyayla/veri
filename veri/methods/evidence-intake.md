---
id: MET-004
type: method
title: "veri:evidence-intake — the evidence door, staffed"
status: accepted
approved: 2026-08-28
description: >-
  Staffs the evidence door: takes material arriving from outside — user
  feedback, metrics, a support ticket, a competitor move, an incident,
  research findings — and files it as a source linked to what it bears on,
  so it lands on the graph instead of in a drawer. Use it when something
  external is pointed at the record: "here is a support thread where three
  customers hit the same import failure, get it on the record against
  whatever it bears on", "last month's activation numbers
  came back for the onboarding release, file them", "a competitor just
  shipped the thing REQ-021 bets against, where does that go?". It files
  the material faithfully, with tests, supports or refutes links to the
  requirements and outcome-of links to the shipping work orders, and
  leaves what it means to you. Not for judging a bet whose evidence is
  already in: "did the caching work actually move p95 latency to the
  target REQ-028 declared?", "all of REQ-035's work orders are done, was
  the bet right or do we retire it?" are veri:did-it-work's, which needs
  the filing first. Not for "thanks, that worked", or anything carrying no
  observation.
requires:
  - file_source
  - search
  - get_neighbors
  - get_import_instructions
  - run_check
upstream: veri/evidence-intake
created: 2026-08-27
updated: 2026-09-01
links:
  - id: WF-001
    rel: derived-from
  - id: SRC-060
    rel: derived-from
  - id: REQ-040
    rel: serves
  - id: REQ-033
    rel: constrained-by
  - id: REQ-038
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

**This method does not occupy a stage of the loop. It feeds all of them.**
Evidence arrives whenever reality feels like arriving — before a problem
is defined, in the middle of a decision, months after a work order
shipped — and the gate is the doorway, not a position in the sequence.

What the user gets from it: material that is on the graph rather than in
a chat log, linked to the requirement it bears on in the direction the
tooling actually reads. The second half matters more than it sounds. An
edge written backwards is not a smaller version of the right edge; it is
a no-op that leaves the bet looking untested forever ([[DEC-113]]).

This is also the gate that closes [[WF-001]]'s loop, and the loop has
never run on this project by any route but a hand-filed one ([[SRC-062]]).
The skill should behave accordingly: the filing step is the point, and a
session that discussed evidence beautifully and filed nothing has failed.

## What it reads

- **The material itself, first and in full.** Whatever the user pasted or
  pointed at, read before any search, because the search terms come out
  of it.
- **`search` and `get_neighbors`** over what the material is about, for
  the requirements and decisions it plausibly bears on — plausibly, since
  which one it actually bears on is a question for the user, not an
  inference for the skill.
- **`get_import_instructions()`.** The project's filing rules, its link
  relations, and its source template. This gate's whole output is one
  document with correct edges, so the document that states the filing
  rules is not optional reading.
- **`run_check()`.** Advisories name the open questions evidence could
  answer — an untested bet is a hypothesis whose work shipped and whose
  answer never arrived. Read before, to see what is waiting; read after,
  to confirm the edge landed.
- **The pending block.** A draft requirement is context, never the thing
  the evidence is filed against as though it were settled ([[REQ-008]]).

All of it through the MCP tools ([[DEC-125]]): no reading `veri/` off
disk, no shelling out to the CLI.

## The interview

This gate is mostly triage and one filing act: **four beats that end in a
filed source, and two interrupts — one when interpretation is being
folded into the evidence, one when what arrived is not evidence at all.**
It asks few questions and each one determines an edge, so a wrong answer
here is a wrong link rather than a wrong paragraph.

1. **Say what the material is, and classify it.** Unconditional, and it
   comes before any search:

   > "This reads as <user-feedback | metric | external-eval |
   > investigation | outcome | design | reference> evidence, dated
   > <when>, from <where>. Correct the class if I have it wrong — it is
   > how the record will be read later."

   The class is the source's `kind` ([[REQ-038]]); absent it defaults to
   `reference`, which is the shrug.

2. **Name what it plausibly bears on, and ask which relation.** The skill
   proposes candidates and the user picks the edge:

   > "This looks like it bears on [[REQ-040]]. Does it *test* it — bears
   > on the bet without settling it — *support* it, or *refute* it? And
   > does it bear on anything else?"

   Different answers write different edges and nothing else changes. The
   skill never picks between support and refute on its own: that is the
   judgment [[WF-001]] rule 9 reserves.

3. **One observation or a pattern?** The question that decides how much
   the record should be seen to claim:

   > "Is this one occurrence, or the third time? I'll write whichever it
   > is — a single instance filed as a trend is how a record starts
   > lying."

   A single instance is filed as a single instance and is still worth
   filing; nothing here requires evidence to be conclusive.

4. **Does it answer a bet that already shipped?** Conditional, and it is
   the beat that closes the loop:

   > "[[REQ-040]] is a hypothesis and WO-133 shipped against it. If this
   > is reality reporting back, the source links the requirement with
   > <tests|supports|refutes> and links WO-133 with `outcome-of`. Both
   > edges, or the untested-bet advisory keeps firing."

   Then file, then `run_check`, and report the advisory count before and
   after. The advisory clearing is the only proof the edges landed the
   right way round.

5. **Interrupt — when interpretation is being folded into the source.**
   Fires the moment a conclusion is offered as part of the material:

   > "'So we should retire [[REQ-040]]' is your reading, not what the
   > evidence says. It goes in this conversation and into whatever you
   > decide next — the source records what was observed."

   Evidence that carries its own verdict cannot later be re-read by
   someone who disagrees, which is the whole reason it is filed
   separately from the documents that cite it.

6. **Interrupt — when what arrived is not evidence.** An acknowledgement,
   an impression, a hope:

   > "There's no observation in that — no measurement, no user, no
   > incident, no date. Nothing to file. Tell me what you saw and I'll
   > file that."

## What it files

- **Source documents, via `file_source`**, with the material faithfully
  reproduced or excerpted with its provenance — where it came from, when,
  and who observed it — plus `kind` from [[REQ-038]]'s classes and the
  links beat 2 and beat 4 established. Sources carry no approval gate of
  their own; what they must carry is correct edges.
- **Nothing else.** Not a revised requirement, not a proposed decision,
  not a work order. Every one of those is a judgment about what the
  evidence means, and each has its own gate.

**The link discipline, restated in full because getting it wrong is a
check violation.** These are mechanical facts about the surface, verified
against `packages/core/src/check.ts` and [[DEC-113]] on 2026-08-27:

- **From a source, direction is enforced at issue tier.** An outcome rel
  (`tests`, `supports`, `refutes`) must target a *requirement*, and
  `outcome-of` must target a *work order*. Anything else is an
  `invalid-outcome-link` issue.
- **The backwards edge is flagged anywhere it appears** — an outcome rel
  pointing *at* a source is the evidence edge written the wrong way — as
  is `outcome-of` on any document that is not a source.
- **Elsewhere the same words stay free text.** On a work order or a
  requirement, "supports" keeps its ordinary English meaning and is not
  policed. Only the source side is a vocabulary.
- **Both edges or neither, for an outcome.** The untested-bet advisory
  clears only for a hypothesis with at least one linked work order, all
  of them done, and a source linking it with an outcome rel. A misdirected
  edge does not half-work: it silently fails to count.
- **A correct edge pays out immediately.** Context assembly promotes a
  requirement's outcome sources into the core ring and names them on the
  requirement as an "Outcome evidence:" line — so the next session
  planning against that bet sees what reality said, without a retrieval
  hop.

## Guardrails

Every refusal names what is missing and what would fix it. A skill that
cannot file what it collected refuses rather than degrading ([[DEC-125]]).

- **Never writes an `approved:` stamp.** Promotion is the user's act,
  always ([[REQ-008]], [[DEC-111]]). Evidence never promotes, retires or
  revises anything on its own arrival — [[WF-001]] rule 9, and the reason
  this gate can afford to file freely.
- **Files faithfully; interprets out loud.** *"I'll file what the thread
  says. What it means for [[REQ-040]] is your call, and I'll say what I
  think in this conversation rather than in the document."*
- **Never guesses between supports and refutes.** *"I can see it bears on
  [[REQ-040]], but which way it cuts is exactly the judgment I'm not
  licensed to make. Which is it?"*
- **Never files a single observation as a pattern**, and never writes an
  inference in the voice of an observation. Where the material had to be
  reconstructed, say so in the source.
- **Never files the same evidence twice.** `search` before filing; a
  duplicate source splits the evidence for one bet across two ids and
  neither carries the weight.
- **Never leaves a filed source unverified.** `run_check` after filing,
  with the `skipped` list reported verbatim — the git-backed tier does not
  run over MCP, so "the check passed" and "the checks that could run
  passed" are different claims.
- **A missing required tool is a refusal with a named repair.** Without
  `file_source` this gate is a conversation about evidence that ends with
  the evidence still in a chat log, which is the exact failure it exists
  to prevent.

## Handoff

**This method has no single successor, by construction.** It feeds every
stage rather than occupying one, so the exit is chosen by what the
evidence bears on — and a method that named one next gate would have
mis-stated what this gate is.

- **`veri:did-it-work`** — when the evidence answers a bet that already
  shipped. The source is filed and linked; what awaits is the user's
  judgment on whether the bet was confirmed, refuted, or measured badly,
  and that skill runs it. This is the exit that closes [[WF-001]]'s loop.
- **`veri:define`** — when the evidence demands revised intent: a
  requirement that no longer says what the project believes, or a want
  the evidence has just made concrete. The revision of anything already
  accepted stays the user's act.
- **`veri:decide`** — when the evidence reopens a choice rather than a
  requirement: an active decision whose revisit condition has arrived,
  including the competitor move that changes what a tradeoff costs.
  Supersession, never a silent edit.
- **`veri:health`** — when the material is one instance of a pattern of
  decay rather than a finding of its own.
- **Nowhere at all** is a legitimate exit, and the most common one.
  Evidence filed against a live requirement with no action taken is the
  gate working: it is on the graph, it rides in that requirement's
  context package, and the next session to plan against it will see it.
  Say so plainly rather than inventing a successor.
