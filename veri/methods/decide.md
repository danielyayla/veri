---
id: MET-006
type: method
title: "veri:decide — the fork made on purpose and on record"
status: accepted
approved: 2026-08-28
description: >-
  The gate where two or more real ways forward with different sacrifices
  become one proposed decision carrying the paths that lost. Use it when
  the choice is the live thing: "should we scan uploads inline on the
  request, or queue them to a worker?", "we already agreed uploads must be
  scanned, now it is a
  Postgres queue versus SQS", "DEC-062 says advisory by default and I now
  think that is wrong, I want to revisit it". It forces at least two
  alternatives that could genuinely have been chosen, pressure-tests each
  against the requirements it strains, and files the choice as proposed
  with its revisit conditions and rejection reasons. Not for a wanted
  property with no alternatives on the table: "every uploaded file has to
  be virus-scanned before anyone can download it, and that has to stay
  true", "I want search results to feel faster" are veri:define's, because
  what is missing is a requirement, not a choice. Not for a chore with
  only one way to do it — "bump zod to the latest 3.x and fix whatever
  breaks", "reformat this file and sort the imports".
requires:
  - file_decision
  - search
  - get_neighbors
  - get_document
upstream: veri/decide
created: 2026-08-27
updated: 2026-08-28
links:
  - id: WF-001
    rel: derived-from
  - id: SRC-060
    rel: derived-from
  - id: REQ-040
    rel: serves
  - id: DEC-128
    rel: informed-by
  - id: DEC-125
    rel: constrained-by
  - id: DEC-130
    rel: constrained-by
  - id: REQ-008
    rel: constrained-by
---

## Purpose

This gate is the stretch between "there is more than one way to do this"
and a decision somebody can read in two years and understand. It owns
forks wherever they surface — in a conversation, mid-planning, or thrown
here by another skill that noticed one and was not licensed to pick it.

What the user gets from it: the losing options preserved. A decision
recorded without its alternatives is a note; it says what was done and
nothing about why the other thing was not, which is precisely what the
next person needs when they arrive wanting to do the other thing. This
project holds 127 decisions with recorded alternatives, and that is a
floor to defend rather than a score to improve ([[DEC-128]]).

Its characteristic failure is agreeable: producing a decision whose
second option was never real. A recommendation with a strawman beside it
looks exactly like a considered choice and carries none of the value.

## What it reads

- **The requirements the decision must serve**, via `search` and
  `get_document`. A fork with no requirement behind it is usually a want
  in disguise, and beat 7 sends it back.
- **The neighbouring active decisions**, via `get_neighbors`. A new
  decision that contradicts a live one is not a decision, it is a
  conflict; the route for that is supersession, deliberately.
- **The superseded chains in the same area.** The most useful thing in
  the record is often that this exact fork was taken before and reversed.
  Whatever made it reverse belongs in the new decision's revisit
  conditions.
- **The pending block.** A proposed decision in the same area means the
  fork may already be on the table awaiting a stamp — better to amend
  that proposal than to file a second one against it ([[REQ-008]]).

All of it through the MCP tools ([[DEC-125]]): no reading `veri/` off
disk, no shelling out to the CLI.

## The interview

**One orienting beat, three of pressure, one symmetric read-back, and two
interrupts — one when the second alternative is a strawman, one when the
fork turns out to be a want.** The pressure is entirely about the options:
this gate does not interrogate whether the thing should be done, only
whether the choice between ways of doing it was genuinely made.

1. **Say what the decision is bounded by, before weighing anything.**

   > "This has to serve [[REQ-040]] and must not contradict [[DEC-125]],
   > which is active. [[DEC-126]] took a version of this fork the other
   > way and was withdrawn — worth knowing why before we pick."

   A fork nothing constrains is a preference, and saying so early saves
   the whole interview.

2. **What are we optimising, and what are we knowingly sacrificing?**
   Both halves, and the second is the one that gets skipped:

   > "Name the thing you are willing to be worse at. If nothing gets
   > worse, there is no tradeoff here and no decision to file."

   An answer of "nothing" means the options are not actually different,
   and the beat repeats until a real sacrifice is named or the fork
   dissolves.

3. **Put at least two alternatives on the table that could have been
   chosen.** The load-bearing beat:

   > "Give me the second option as its own best case — the version its
   > advocate would argue, not the version that makes ours look good.
   > What would have to be true for it to win?"

   An option nobody could argue for does not count, and the count that
   matters is of *real* alternatives, not of bullets.

4. **What does each option strain, and what would make us revisit this?**
   Revisit conditions are cheap now and are the only thing that lets a
   later reader know the decision has expired:

   > "A strains [[REQ-040]] because <why>; B strains [[DEC-113]]. And
   > what would you have to see to reopen this — a number, a scale, a
   > failure mode?"

5. **Read the options back symmetrically, then recommend, then file.**
   Order matters: a recommendation offered before the symmetric summary
   turns the summary into justification.

   > "A: gains <what>, costs <what>, strains <ids>. B: gains <what>,
   > costs <what>, strains <ids>. Revisit when <condition>. My reading is
   > A, because <the one reason>. Say if B is the one you want — I'll
   > file whichever, as a proposal either way."

6. **Interrupt — when the second option is a strawman.** Fires whenever
   an alternative arrives already defeated:

   > "That option is there to lose. Either give me one somebody would
   > actually pick, or let's admit this isn't a fork and file it as the
   > requirement it is."

7. **Interrupt — when the fork is really a want.** Fires when the
   supposed options turn out to be one thing nobody has required yet:

   > "Those aren't two ways to do the same thing — they're two different
   > things to want. `veri:define` turns the want into a requirement, and
   > if a genuine fork survives that, it comes back here."

## What it files

- **Proposed decisions, via `file_decision`** — the choice, the
  alternatives with the reason each lost, the rationale, and the revisit
  conditions. Status `proposed`, and the tool hardcodes it: there is no
  status parameter to send and no way to file an active decision.
- **The rejected alternatives are not optional.** A decision filed with
  an empty `rejected_alternatives` is a note wearing a DEC id, and it
  loses the one property the record is being kept for.
- **Nothing else.** No requirements — beat 7 exists so the want goes to
  its own gate. No work orders — a decision does not authorise work, an
  approved requirement and a plan do.

**Three mechanical facts about the surface, verified against
`packages/mcp/src/server.ts`, `packages/core/src/schema.ts` and
[[MET-001]] on 2026-08-27:**

- **Link direction is not a style choice.** Put the work order in the
  *decision's* links (`{id: WO-133, rel: constrains}`). Adding the new
  proposal to the *work order's* links makes a claimed work order depend
  on an unapproved document, which fails the gate check the moment it is
  written ([[REQ-008]]).
- **Supersession is filed forward and closed backward, after the stamp.**
  File the new decision with a `supersedes` link to the old one. The
  backward half — `status: superseded` with `superseded_by:` set — is
  `supersede_decision`, which writes both lines together so the pair the
  schema requires is never half applied. It refuses a successor that is
  still `proposed` ([[DEC-140]]): until the user approves the
  replacement, retiring the old decision would leave the fork governed by
  nothing. So the closing order is fixed — file forward, hand the
  proposal to the user, and call `supersede_decision` once they have
  stamped it. A session that files the replacement and stops has not left
  a reversal half-recorded; it has left it correctly open at the gate.
- **A proposal does not un-authorise the code already written under it.**
  A decision filed mid-implementation records what was chosen; it does
  not gate the work order that was already cleared for dispatch.

## Guardrails

Every refusal names what is missing and what would fix it. A skill that
cannot file what it collected refuses rather than degrading ([[DEC-125]]).

- **Never files a decision with fewer than two real alternatives.** *"I
  have one option and one placeholder. Give me a second somebody could
  argue for, or this is a requirement and belongs to `veri:define`."*
- **Never writes an `approved:` stamp.** Promotion is the user's act,
  always ([[REQ-008]], [[DEC-111]]). Everything here lands `proposed`,
  including a reversal of a decision the user themselves once approved.
- **Presents tradeoffs symmetrically before any recommendation.** A
  recommendation is allowed and often wanted; leading with it is what
  turns the alternatives into decoration.
- **Never edits an active decision.** Disagreement with one is
  supersession, deliberately and forward. *"[[DEC-125]] is active. I
  can't revise it — what I can do is file a decision that supersedes it
  and say plainly what changed."*
- **Never folds a decision into a work order's prose.** *"That's a
  choice, so it gets a DEC id. Burying it in a scope section means the
  next person finds the consequence and not the reasoning."*
- **Never decides a product tradeoff on the user's behalf.** A fork whose
  answer changes what the user is buying, rather than how it is built, is
  presented and waited on, not absorbed.
- **A missing required tool is a refusal with a named repair.** Without
  `file_decision` this gate produces a well-argued fork that exists only
  in a transcript; without `get_neighbors` or `get_document` its claim
  that nothing active contradicts the choice is recall wearing a
  citation.

## Handoff

One unconditional exit, then back to wherever the fork came from:

- **The user's approval pass comes first, always.** The decision is
  `proposed` and binds nothing until stamped; `veri:approval-session`
  runs that queue. A proposal is visible and non-binding meanwhile — it
  records what was chosen, it does not authorise anything ([[REQ-008]]).
- **Back to the skill that surfaced the fork**, with the decision id in
  hand: `veri:plan-work` resumes cutting, `veri:implement` un-pauses on
  the work order it paused, `veri:define` resumes the requirement whose
  drafting hit the fork. The condition is simply which gate was
  interrupted; nothing about that gate changed while this one ran.
- **`veri:define`** — when beat 7 fired and the want under the fork was
  never a requirement. It comes back here if a real fork survives.
- **The supersession edit on the old decision**, when there was one, is
  either in the same commit or in the user's hands, and this gate's
  closing report says which. Until it lands, two decisions in the record
  say opposite things and neither is marked as retired.
- **`veri:evidence-intake`** — when the fork could not be settled because
  nobody has measured the thing it turns on. Filing what is known, and
  naming what is not, beats filing a decision that pretends to know.
