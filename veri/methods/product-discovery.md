---
id: MET-003
type: method
title: "veri:product-discovery — idea to problem, direction and first bets"
status: accepted
approved: 2026-09-01
description: >-
  Turns a vague idea into a defined problem, a direction, non-goals and the first named bets — the gate an empty or reopened record passes through before anything can be required of it. Use it when the utterance carries enough to argue with: "I have an idea for a tool that helps freelance designers chase unpaid invoices, nothing is written down yet", "we are pivoting, the team-collaboration angle is not landing and I want to restart from the solo user's problem", "nobody is using the free tier and we never defined the problem it solves". It interviews Socratically, one question at a time, then files a product-brief source and one draft requirement per foundational bet. Not for a record whose problem is settled and whose user is the thing in doubt: "we keep writing 'small teams' into every requirement and I could not tell you who that actually is" wants a user-research pass, not this interview, because what is undefined is who rather than what. Not for a bare "I have an idea" carrying nothing — that is veri:wayfinder's triage — nor for chores like "bump zod to the latest 3.x".
requires: [file_source, file_requirement, get_intent]
upstream: veri/product-discovery
created: 2026-08-27
updated: 2026-09-01
links:
  - { id: WF-001, rel: derived-from }
  - { id: SRC-060, rel: derived-from }
  - { id: SRC-066, rel: derived-from }
  - { id: REQ-040, rel: serves }
  - { id: REQ-032, rel: constrained-by }
  - { id: REQ-041, rel: constrained-by }
  - { id: DEC-125, rel: constrained-by }
  - { id: DEC-130, rel: constrained-by }
  - { id: REQ-008, rel: constrained-by }
---
## Purpose

The stretch between "I have an idea" and a record that can be argued
with: a problem concrete enough to be wrong, a direction, non-goals,
and the beliefs underneath named as bets — the seed documents
everything else grows from. The loudest gate in the library; its
characteristic failure is accepting the first answer.

## What it reads

- **Whatever already exists, which is often nothing** — an empty record
  is this gate's normal start.
- **`get_intent(<path>)`** on a pivot; **`search`/`list_documents`**
  where a record exists, so a pivot argues with prior briefs.
- **The README and what the user points at** — context, never canon.
  The record only through MCP ([[DEC-125]]).
- **Bare repository:** only `init_project` works — absent from
  `requires:` because conditional; without it, name `veri init` as the
  repair and stop ([[REQ-041]] item 5).

## The interview

Four Socratic beats one at a time, a read-back before filing, two
interrupts — no knowledge base, and a belief handed over as fact.

1. **Interrupt — no knowledge base.** Ask before scaffolding; no ends
   cleanly, yes calls `init_project`.
2. **What breaks today, for whom — and what if nobody builds this?**
   Push for the last concrete instance; an abstraction becomes the
   next question.
3. **Smallest version that would prove the idea has legs?** Smallest
   whose result would change belief; "nothing would change" = no test.
4. **Which belief, if wrong, kills this?** The bets beat ([[REQ-032]]):
   belief, then the number that would end it. Will test → draft
   hypothesis; will not → open question, never a quieter requirement.
5. **What are you explicitly not building?** Non-goals let
   `veri:plan-work` refuse scope later without relitigating.
6. **Read the brief back, then file** — problem, who, direction,
   non-goals, bets with metric and target, open questions.
7. **Interrupt — enthusiasm as evidence.** No observation → a bet or an
   open question, never a constraint; laundering is the worst output.

## What it files

- **A product-brief source** (`file_source`, `kind: design`) —
  evidence, not intent; interpretation belongs to what cites it.
- **One draft requirement per foundational bet** (`file_requirement`,
  `kind: hypothesis`, `outcome` with metric and target, `derived-from`
  the brief). Bet-first is the default, not a per-bet choice
  ([[REQ-032]], [[SRC-066]]): at discovery nothing has evidence yet, so
  every requirement this gate files is a hypothesis with an outcome
  block, and `kind: constraint` is the argued exception — an invariant
  true by definition, said out loud, never the quiet default. `draft`,
  always. Nothing else: no decisions, no work orders.

Mechanical: `file_requirement` carries `kind` and `outcome` in one
call; it refuses a kind outside `constraint | hypothesis` and an
outcome missing either half. A hypothesis with no outcome files, with
the check violation reported — get the terms, never downgrade to a
constraint, which raises no untested-bet advisory ([[REQ-033]]).

## Guardrails

- **Never writes an `approved:` stamp.** Promotion is the user's act,
  always ([[REQ-008]], [[DEC-111]]). Everything this gate produces is
  `draft`. *"The brief is filed and the three bets are drafts — none of it
  binds anything until you approve it."*
- **Never files enthusiasm-only intent without labelling it a
  hypothesis** ([[SRC-060]]).
- **An unevidenced want is a hypothesis by default** — constraint takes
  an argument, never inertia: 41 requirements with 2 hypotheses is
  assumption laundered into constraint at scale ([[SRC-066]]).
- **An untested assumption is an open question**, never a quieter
  requirement.
- **Never scaffolds without asking** ([[DEC-125]], [[REQ-041]]).
- **Never rewrites an existing brief on a pivot** — the new links the
  old.
- **Never touches accepted intent** — say so and stop.
- **A missing required tool is a refusal with a named repair** — intent
  in a transcript has no id, no status, no place in the graph.

## Handoff

- **`veri:define`** — once the brief is approved, per bet: the
  ordinary exit.
- **The brief and draft bets await the user's stamp** — `veri approve`,
  or the app's review queue.
- **A user never named concretely** is said in the brief; open
  questions ride as assumptions until user research answers them.
- **The hypothesis frontmatter edit** — same commit or the user's
  hands; the closing report says which.
- **No knowledge base, no consent** — end cleanly, nothing written.
