---
id: MET-003
type: method
title: "veri:product-discovery — idea to problem, direction and first bets"
status: accepted
approved: 2026-08-28
description: >-
  Turns a vague idea into a defined problem, a direction, non-goals and
  the first named bets — the gate an empty or reopened record passes
  through before anything can be required of it. Use it when the utterance
  carries enough to argue with: "I have an idea for a tool that helps
  freelance designers chase unpaid invoices, nothing is written down yet",
  "we are pivoting, the team-collaboration angle is not landing and I want
  to restart from the solo user's problem", "nobody is using the free tier
  and we never defined the problem it solves". It interviews Socratically,
  one question at a time, then files a product-brief source and one draft
  requirement per foundational bet. Not for a record whose problem is
  settled and whose user is the thing in doubt: "we keep writing 'small
  teams' into every requirement and I could not tell you who that actually
  is" wants a user-research pass, not this interview, because what is
  undefined is who rather than what. Not for a bare "I have an idea"
  carrying nothing — that is
  veri:wayfinder's triage — nor for chores like "bump zod to the latest
  3.x".
requires:
  - file_source
  - file_requirement
  - get_intent
upstream: veri/product-discovery
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

This gate is the stretch between "I have an idea" and a record that can
be argued with: a problem stated concretely enough to be wrong, a
direction, the things deliberately not being built, and the beliefs the
whole thing rests on named as bets rather than assumed as facts.

What the user gets from it: the seed documents everything else grows
from. Without them `veri:define` has no intent to refine and
`veri:plan-work` has nothing accepted to cut, and a project that skips
this gate learns three months later that it never wrote down what it was
for.

It is the loudest gate in the library, deliberately: the other methods
guard boundaries somebody already drew, this one is where the boundaries
come from. Its characteristic failure is not asking too much but
accepting the first answer.

## What it reads

- **Whatever already exists, which is often nothing.** In a fresh repo
  that is the point: an empty record is this gate's normal starting
  condition, and the interview supplies what reading cannot.
- **`get_intent(<path>)`, when the utterance names code.** On a pivot
  there is a live product already, and what governs it is the thing being
  reopened. "Nothing governs this path" is a finding, not an error.
- **`search` and `list_documents` in a project that has a record.** Prior
  briefs and prior evidence, so a pivot argues with what was believed
  before rather than quietly replacing it.
- **The README and whatever the user points at**, through the session's
  ordinary file tools. Repository prose is context, never canon: it is
  read to ask better questions, and never becomes a requirement without
  passing through the interview.

Everything about the record goes through the MCP tools ([[DEC-125]]): no
reading `veri/` off disk, no shelling out to the CLI.

**The bare-repository branch and its tool.** With no knowledge base at
all, every tool above fails and `init_project` is the one that does not.
It is deliberately absent from `requires:` — that list holds unconditional
refusal conditions, and a project that already has a `veri/` needs nothing
from it. Its refusal is narrower: with no knowledge base and no
`init_project` on the connected tool list, name `veri init` in a terminal
as the repair and stop ([[REQ-041]] item 5).

## The interview

This gate inverts [[MET-001]]'s ratio: **four Socratic beats asked one at
a time, one read-back before anything is filed, and two interrupts — one
when there is no knowledge base to write into, one when a belief is being
handed over as a fact.** Questions are asked singly and answered before
the next arrives; a list of five questions in one message gets one
answer to the easiest of them.

1. **Interrupt, before anything else — no knowledge base yet.** Fires
   only when the repository has no `veri/`:

   > "There's no Veri knowledge base here yet. Everything below gets
   > filed into one — shall I create it? It adds a `veri/` directory and
   > two pointer files, and nothing else."

   A no is a legitimate answer and ends the session cleanly; a yes calls
   `init_project` and says what was written.

2. **What breaks or hurts today, for whom — and what happens if nobody
   builds this?** The question and its follow-up: an answer to the first
   that cannot survive the second is a preference, not a problem:

   > "Describe the last time somebody actually hit this. Who were they,
   > what were they doing, and what did they do instead?"

   A concrete instance becomes a problem statement; an abstraction
   ("freelancers struggle with invoicing") becomes the next question.

3. **What is the smallest version that would prove the idea has legs?**
   Not the smallest shippable product — the smallest thing whose result
   would change what the user believes:

   > "If that shipped and nothing improved, what would you conclude?"

   "Nothing" means it is not a test, and the beat repeats.

4. **Which of your beliefs, if wrong, kills this?** The beat that
   produces the bets, and the reason [[REQ-032]]'s discipline applies from
   day one rather than being retrofitted:

   > "Name the belief. Then: what would you have to see to stop believing
   > it — a number, and where it comes from?"

   A belief the user will test becomes a draft requirement of kind
   hypothesis; one they will not test stays in the brief as an open
   question, never a quieter requirement.

5. **What are you explicitly not building?** Non-goals are cheap here and
   expensive later:

   > "Name three things a reasonable person would expect this to do that
   > it will not do."

   They become the brief's non-goals, and later they are what lets
   `veri:plan-work` call something out of scope without relitigating the
   product.

6. **Read the brief back, then file it and the bets.** In the skill's own
   words, before a single document is written:

   > "Problem: <one sentence>. For: <who>. Direction: <one sentence>. Not
   > building: <the non-goals>. Bets: <each belief, with the metric and
   > target that would settle it>. Open questions you're not testing yet:
   > <the rest>. Correct me and I'll file after that."

   Filing first makes the correction an amendment instead of a sentence.

7. **Interrupt — when enthusiasm is being handed over as evidence.**
   Fires whenever a claim about users, demand or behaviour arrives with
   no observation behind it:

   > "That's a belief, not something we've seen. It can be a bet with a
   > metric and a target, or an open question in the brief. It can't be a
   > constraint — nothing observed says it must stay true."

   Laundering enthusiasm into a constraint is this gate's worst output:
   everything downstream then treats it as settled.

## What it files

- **A product-brief source**, via `file_source` with `kind: design` — the
  problem, who it is for, the direction, the non-goals, and the open
  questions the user declined to bet on. Filed as evidence rather than as
  intent: it records what was said here, and interpretation belongs to
  the documents that cite it.
- **One draft requirement per foundational bet**, via `file_requirement`
  with `kind: hypothesis` and the `outcome` block naming the metric and
  the target that would confirm or refute it, plus a `derived-from` link
  to the brief. Status `draft`, always.
- **Nothing else.** No decisions — nothing has forked yet; no work orders
  — nothing is approved yet. A discovery session that produced a work
  order skipped two gates.

**A bet is filed as a bet, in one call.** `file_requirement` carries
`kind` and `outcome` alongside title, body, acceptance criteria and
links, so [[REQ-032]]'s distinction reaches the record through the tool
rather than through a follow-up edit:

> ```
> kind: hypothesis
> outcome:
>   metric: <what is measured>
>   target: <the number that would settle it>
> ```

The tool refuses a kind outside `constraint | hypothesis` and an outcome
missing either half. It does *not* refuse a hypothesis with no outcome —
it files it and says that `veri check` calls it a violation, which is the
signal to go back and get the terms, never a reason to downgrade the bet
to a constraint. A bet filed as a constraint raises no untested-bet
advisory ([[REQ-033]]), so nothing would ever ask whether it paid off:
that is the laundering beat 7 exists to prevent, arriving through the
tool surface instead of the conversation.

## Guardrails

Every refusal names what is missing and what would fix it. A skill that
cannot file what it collected refuses; it never interviews with nowhere
to put the result ([[DEC-125]]).

- **Never writes an `approved:` stamp.** Promotion is the user's act,
  always ([[REQ-008]], [[DEC-111]]). Everything this gate produces is
  `draft`. *"The brief is filed and the three bets are drafts — none of it
  binds anything until you approve it."*
- **Never files a requirement whose only evidence is the user's
  enthusiasm without labelling it a hypothesis** — [[SRC-060]]'s guardrail
  for this gate, and why beat 7 is an interrupt rather than a closing
  check.
- **An assumption the user will not commit to testing is an open
  question, not a quieter requirement.** *"You won't name what would
  change your mind on that, which is fine — it goes in the brief as an
  open question, and no requirement will rest on it."*
- **Never scaffolds a knowledge base without asking** ([[DEC-125]],
  [[REQ-041]]). Having Veri installed is not consent to restructure a
  repository.
- **Never rewrites an existing brief in place on a pivot.** A pivot files
  a new brief linking the old one; what was believed before is what makes
  the pivot legible.
- **Never touches accepted intent.** If discovery contradicts an accepted
  requirement, say so and stop — revising approved intent is the user's
  act, never a quiet redraft.
- **A missing required tool is a refusal with a named repair.** Without
  `file_source` there is nowhere to put the brief; without
  `file_requirement` the bets live only in a transcript — durable-feeling
  intent with no id, no status and no place in the graph.

## Handoff

Two successors, both conditional on what the interview actually reached,
plus what the session leaves waiting:

- **When the interview could not name a user concretely** — beat 2
  answered in the abstract after two pushes — say so in the brief rather
  than papering over it: the user model is the weakest claim on record,
  and the open questions ride along, tagged as assumptions until real
  user research answers them.
- **`veri:define`** — once the brief is approved, for each bet that must
  become a requirement with observable criteria. The ordinary exit, and
  the one that turns a direction into something plannable.
- **The brief and the draft bets await the user's stamp** —
  `veri approve`, or the app's review queue. Until then they are visible
  and non-binding: they record what was said, they do not authorise work.
- **The frontmatter edit for every hypothesis** is either in the same
  commit or in the user's hands, and the closing report says which. A bet
  still sitting as `kind: constraint` never raises [[REQ-033]]'s
  untested-bet advisory, so the loop that judges it never opens.

And when the session ended without a filed brief: no knowledge base and
no consent to create one ends it cleanly with nothing written — the
correct outcome, not a failure.
