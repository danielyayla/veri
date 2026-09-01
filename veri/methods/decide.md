---
id: MET-006
type: method
title: "veri:decide — the fork made on purpose and on record"
status: accepted
approved: 2026-08-28
description: >-
  The gate where two or more real ways forward with different sacrifices become one proposed decision carrying the paths that lost. Use it when the choice is the live thing: "should we scan uploads inline on the request, or queue them to a worker?", "we already agreed uploads must be scanned, now it is a Postgres queue versus SQS", "DEC-062 says advisory by default and I now think that is wrong, I want to revisit it". It forces at least two alternatives that could genuinely have been chosen, pressure-tests each against the requirements it strains, and files the choice as proposed with its revisit conditions and rejection reasons. Not for a wanted property with no alternatives on the table: "every uploaded file has to be virus-scanned before anyone can download it, and that has to stay true", "I want search results to feel faster" are veri:define's, because what is missing is a requirement, not a choice. Not for a chore with only one way to do it — "bump zod to the latest 3.x and fix whatever breaks", "reformat this file and sort the imports".
requires: [file_decision, search, get_neighbors, get_document]
upstream: veri/decide
created: 2026-08-27
updated: 2026-09-01
links:
  - { id: WF-001, rel: derived-from }
  - { id: SRC-060, rel: derived-from }
  - { id: REQ-040, rel: serves }
  - { id: DEC-128, rel: informed-by }
  - { id: DEC-125, rel: constrained-by }
  - { id: DEC-130, rel: constrained-by }
  - { id: REQ-008, rel: constrained-by }
---
## Purpose

The stretch between "there is more than one way" and a decision legible
in two years: the losing options preserved — a decision without its
alternatives is a note, useless to whoever arrives wanting the other
thing ([[DEC-128]]). Its characteristic failure is agreeable: a
recommendation with a strawman beside it looks like a considered
choice.

## What it reads

- **The requirements the decision must serve** (`search`,
  `get_document`) — a fork with no requirement behind it is a want in
  disguise; beat 7 sends it back.
- **Neighbouring active decisions** (`get_neighbors`) — contradiction
  is supersession, deliberately, never a new conflicting decision.
- **Superseded chains in the same area** — a fork taken before and
  reversed belongs in the new revisit conditions.
- **The pending block** — a proposal in the area is amended, not
  doubled ([[REQ-008]]). All through MCP ([[DEC-125]]).

## The interview

One orienting beat, three of pressure, a symmetric read-back, two
interrupts — a strawman second option, or a fork that is a want.

1. **Say what bounds the decision** — what it serves, what it must not
   contradict, what reversed here before.
2. **What are we optimising, and what knowingly sacrificing?** "Nothing
   gets worse" means no tradeoff and no decision — repeat or dissolve.
3. **At least two alternatives that could have been chosen** — each as
   its own best case; the count that matters is of *real* ones.
4. **What does each strain, and what would reopen this?** Revisit
   conditions are how a later reader knows the decision expired.
5. **Options back symmetrically, then recommend, then file** — in that
   order: a recommendation first turns the summary into justification.
6. **Interrupt — the second option is a strawman.** Get one somebody
   would pick, or admit it is a requirement.
7. **Interrupt — the fork is really a want.** Two different things to
   want → `veri:define`; a genuine fork that survives comes back.

## What it files

- **Proposed decisions** (`file_decision`) — choice, alternatives with
  the reason each lost, rationale, revisit conditions. `proposed` is
  hardcoded: no status parameter exists. Empty
  `rejected_alternatives` is a note wearing a DEC id.
- **Nothing else** — no requirements (beat 7), no work orders (a
  decision authorises nothing).

Mechanical: link direction is not a style choice — the work order goes
in the *decision's* links (`{id: WO-133, rel: constrains}`); the
reverse makes a claimed work order depend on an unapproved document
([[REQ-008]]). Supersession files forward (`supersedes`); the backward
pair (`status: superseded` plus `superseded_by:`) is
`supersede_decision`, which writes both together and refuses a
successor still `proposed` ([[DEC-140]]) — the old decision correctly
stays open until the user stamps the replacement. A proposal filed
mid-implementation does not un-authorise dispatched work.

## Guardrails

- **Never files a decision with fewer than two real alternatives** — a
  second somebody could argue for, or it goes to `veri:define`.
- **Never writes an `approved:` stamp.** Promotion is the user's act,
  always ([[REQ-008]], [[DEC-111]]). Everything here lands `proposed`,
  including a reversal of a decision the user themselves once approved.
- **Presents tradeoffs symmetrically before any recommendation** —
  recommending is fine; leading with it decorates the alternatives.
- **Never edits an active decision** — supersession, forward and
  deliberate.
- **Never folds a decision into a work order's prose** — a choice gets
  a DEC id.
- **Never decides a product tradeoff on the user's behalf** — present
  and wait.
- **A missing required tool is a refusal with a named repair** — a
  well-argued fork in a transcript, or "nothing contradicts" from
  recall.

## Handoff

- **The user's approval pass, first and always** — `proposed` binds
  nothing until stamped: `veri approve`, or the app's review queue.
- **Back to the gate that surfaced the fork**, id in hand:
  `veri:plan-work` resumes cutting, `veri:implement` un-pauses,
  `veri:define` resumes drafting.
- **`veri:define`** — when beat 7 fired.
- **The supersession edit on the old decision** — same commit or the
  user's hands; until it lands, two decisions say opposite things.
- **`veri:evidence-intake`** — a fork turning on something nobody has
  measured: file what is known rather than a decision that pretends.
