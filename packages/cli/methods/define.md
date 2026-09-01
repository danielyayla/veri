---
id: MET-005
type: method
title: "veri:define — interviewing intent into a requirement worth approving"
status: accepted
approved: 2026-08-28
description: >-
  Interrogates a want until the requirement writes itself — the gate
  between a rough want and a requirement worth approving, correctly typed
  and carrying criteria a machine could check. Use it when a property is
  wanted and no alternatives are on the table: "turn the
  export idea into a requirement with acceptance criteria I can actually
  check", "every uploaded file has to be virus-scanned before anyone can
  download it, and that has to stay true", "I want search results to feel
  faster, I think it would cut bounce on the results page". It pushes on
  every vague word until the criteria are observable, or until the thing
  is admitted to be a bet with a metric and a target. Not for a choice
  between named options: "should we scan uploads inline on the request, or
  queue them to a worker?", "we already agreed uploads must be scanned,
  now it is a Postgres queue versus SQS" are veri:decide's, because what
  is open is which way to satisfy something already wanted. Not for
  ordinary work inside existing intent — "add a null check to parseDate",
  "write a unit test for globToRegExp".
requires:
  - file_requirement
  - amend_document
  - search
  - get_neighbors
  - get_intent
upstream: veri/define
created: 2026-08-27
updated: 2026-09-01
links:
  - id: WF-001
    rel: derived-from
  - id: SRC-060
    rel: derived-from
  - id: REQ-040
    rel: serves
  - id: REQ-032
    rel: constrained-by
  - id: REQ-038
    rel: constrained-by
  - id: REQ-041
    rel: constrained-by
  - id: DEC-125
    rel: constrained-by
  - id: DEC-130
    rel: constrained-by
  - id: REQ-008
    rel: constrained-by
---

## Purpose

This gate is the stretch between a want and a requirement: something the
user knows they would like, turned into a statement of what must be true,
typed honestly as a thing that must hold or a thing being bet on, and
carrying criteria somebody other than the author could check.

What the user gets from it: intent that survives contact with an
implementer. A requirement saying "search should feel fast" tells an
agent nothing and cannot be verified by anyone, so it gets satisfied by
whoever is tired at the end of the work order. A requirement saying what
would be observed removes that argument before it happens.

Its whole difficulty sits in one place: the user usually already believes
their requirement is clear. The pressure this gate applies is not
scepticism about the want — it is scepticism about the words, and it is
applied until the sentence would survive being read by a stranger.

## What it reads

- **`get_intent(<path>)`, when the want names code.** What already
  governs the area: the work orders that touched it and the requirements
  and decisions they cite. A want landing on top of governed code is
  usually a refinement of an existing requirement rather than a new one.
- **`search` and `get_neighbors`.** The requirements in the same area,
  the active decisions that constrain them, and the evidence behind them.
  Reading these is what turns "new requirement" into "this refines
  [[REQ-033]]" — the link that stops the record accumulating near-
  duplicates nobody reconciles.
- **The evidence, where any exists.** A want with a source behind it
  drafts differently from a want with none: the first cites, the second
  is a bet, and [[REQ-038]]'s intuition-only advisory will say so either
  way.
- **The pending block.** A draft requirement in the same area is
  amendable rather than duplicable; an accepted one is neither
  ([[REQ-008]]).

All of it through the MCP tools ([[DEC-125]]): no reading `veri/` off
disk, no shelling out to the CLI.

## The interview

**One orienting beat, three of pressure, a closing read-back, and two
interrupts — one when the want turns out to be a fork, one when it
contradicts intent already approved.** The pressure beats are the gate;
skipping them produces a document that looks like a requirement and
verifies nothing.

1. **Say what already exists, before asking anything.** The neighbours,
   with their status, and the honest verdict on whether this is new:

   > "[[REQ-033]] (accepted) already covers part of this, and [[DEC-113]]
   > constrains how. What you're describing looks like a refinement of
   > [[REQ-033]] rather than a new requirement — or is it genuinely
   > separate?"

   A different answer here changes everything downstream: a refinement is
   drafted with a `refines` link and a narrower scope, a new requirement
   is drafted whole.

2. **What must be true when this ships — observable how?** The gate's
   central question, and it is asked again for every word that cannot be
   observed:

   > "'Faster' — faster measured how, from where, against what number?
   > If nobody agreed the number in advance, what test or report would
   > you look at to decide it had happened?"

   The beat repeats. It ends when a criterion could be checked by someone
   who was not in this conversation, or when beat 3 takes over.

3. **Constraint, or bet?** [[REQ-032]]'s question, and the escape hatch
   that makes beat 2 terminate honestly rather than by exhaustion:

   > "Two honest endings here. Either this must hold and keep holding —
   > a constraint, and we need the observable criterion — or it's a bet
   > that doing this improves something, in which case it's a hypothesis
   > and needs a metric, a target, and where the number comes from.
   > Which is it?"

   These are the only two endings. A constraint with unobservable
   criteria is not a third option; it is the failure this gate exists to
   prevent, and calling a bet a bet is not a demotion.

4. **What does this tension with, and what is explicitly out?** Both
   halves in one beat, because both are about boundaries:

   > "This strains [[DEC-113]] — it would mean <what>. And what should a
   > reader know this requirement is *not* asking for?"

   Named tensions become links; unnamed ones become an argument during
   implementation, when the cost of settling them is a diff.

5. **Read it back, then file.** The whole requirement in the skill's own
   words, before the write:

   > "Requirement: <the sentence>. Kind: <constraint | hypothesis, with
   > its metric and target>. Acceptance criteria: <each one, observable>.
   > Refines: <id>. Constrained by: <id>. Out of scope: <what>.
   > Correct me and I'll file after that."

6. **Interrupt — when the want is really a fork.** Fires the moment two
   named ways forward appear with different sacrifices:

   > "That's not one requirement any more — it's a choice between two
   > ways to satisfy one. `veri:decide` owns that fork; I'd be picking
   > it by writing it down. The requirement underneath is <the want>,
   > and I can still draft that."

7. **Interrupt — when it contradicts accepted intent.** Never resolved
   here, and never quietly redrafted:

   > "This contradicts [[REQ-032]], which is accepted. I can't edit an
   > accepted requirement and I won't file a draft that silently opposes
   > one. Either supersede it deliberately through `veri:decide`, or tell
   > me which of the two you want narrowed."

## What it files

- **Draft requirements, via `file_requirement`** — the statement, the
  acceptance criteria as a checklist, beat 3's answer as `kind` (with the
  `outcome` block when it is a bet), and the links the interview
  established: `refines` to the requirement it narrows, `constrained-by`
  to the decisions that bound it, `derived-from` to the evidence behind
  it. Status `draft`, always.
- **Amendments to pending requirements, via `amend_document`**, when beat
  1 found a draft in the same area. Better one requirement revised twice
  than two requirements nobody reconciles.
- **Nothing else.** No decisions — beat 6 exists so this gate does not
  make choices by writing them down. No work orders — nothing is approved
  yet.

**Two mechanical facts about the surface:**

- **`amend_document` is pending-only.** It replaces the title, whole body
  and links of a *draft* requirement, *proposed* decision or *backlog*
  work order, and refuses approved, stamped or started documents outright.
  There is no status field and no approval field to send. This is not an
  obstacle to route around: it is the mechanical form of beat 7.
- **`file_requirement` carries `kind` and `outcome`.** Beat 3's answer is
  sent with the filing, not edited in afterwards:

  > ```
  > kind: hypothesis
  > outcome:
  >   metric: <what is measured>
  >   target: <the number that would settle it>
  > ```

  The tool refuses a kind outside `constraint | hypothesis` and an
  outcome missing either half. It does *not* refuse a hypothesis with no
  outcome — it files it and reports that `veri check` calls it a
  violation. That report is the signal to go back for the metric and the
  target, never a reason to file the bet as a constraint: a constraint
  raises no untested-bet advisory ([[REQ-033]]), so nothing would ever
  ask whether it paid off — the exact laundering beat 3 refuses in
  conversation.

## Guardrails

Every refusal names what is missing and what would fix it. A skill that
cannot file what it collected refuses rather than degrading ([[DEC-125]]).

- **Never drafts a constraint with untestable criteria.** "Fast",
  "intuitive", "reliable", "simple" — the beat repeats until the
  criterion is observable or the kind flips to hypothesis with a metric
  and a target ([[REQ-032]]). *"I can write that sentence down, but
  nobody could ever tell you whether it was satisfied. Give me the number
  or let it be a bet."*
- **Never writes an `approved:` stamp.** Promotion is the user's act,
  always ([[REQ-008]], [[DEC-111]]). Everything here lands `draft`, and a
  draft steers nothing until the stamp lands.
- **Never touches an accepted requirement**, and never files a draft that
  quietly opposes one. Revision of approved intent is a deliberate act
  with its own route.
- **Never picks a fork by writing it down.** A requirement whose
  statement encodes one of two live options is a decision smuggled into
  intent, and it is the smuggling this library exists to catch.
- **Never invents an acceptance criterion the user did not agree to.**
  Criteria are what "done" will be argued against later; one the user
  never said is a trap set for their own implementer.
- **Never duplicates a requirement it could amend.** `search` first;
  near-duplicates split the evidence and both end up half-linked.
- **A missing required tool is a refusal with a named repair.** Without
  `file_requirement` the interview produces durable-feeling intent that
  exists only in a transcript; without `search` or `get_neighbors` every
  claim about what already exists is recall wearing a citation.

## Handoff

The exits are the two the requirement's own shape selects, plus the queue
this gate always leaves behind:

- **The user's approval pass comes first, unconditionally.** A draft
  requirement is visible and non-binding; nothing downstream may treat it
  as intent until the user stamps it — `veri approve`, or the app's
  review queue. This is the one step of the sequence no skill can
  perform.
- **`veri:decide`** — when the requirement, once stated, forces a choice
  between real alternatives, including anything beat 6 set aside. What
  waits there is a proposed decision, and it waits for the same stamp.
- **`veri:plan-work`** — when it does not. Once the requirement is
  accepted, cutting it into bounded work is the next gate, and its work
  orders land in backlog awaiting the stamp in turn.
- **`veri:evidence-intake`** — when the interview showed the want rests
  on an observation nobody ever filed. A requirement with no evidence
  behind it is legitimate and gets an intuition-only advisory saying so
  ([[REQ-038]]); filing the evidence is how that advisory closes.
- **The frontmatter edit for every hypothesis** is either in the same
  commit or in the user's hands, and this gate's closing report says
  which.
