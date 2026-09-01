---
id: MET-005
type: method
title: "veri:define — interviewing intent into a requirement worth approving"
status: accepted
approved: 2026-08-28
description: >-
  Interrogates a want until the requirement writes itself — the gate between a rough want and a requirement worth approving, correctly typed and carrying criteria a machine could check. Use it when a property is wanted and no alternatives are on the table: "turn the export idea into a requirement with acceptance criteria I can actually check", "every uploaded file has to be virus-scanned before anyone can download it, and that has to stay true", "I want search results to feel faster, I think it would cut bounce on the results page". It pushes on every vague word until the criteria are observable, or until the thing is admitted to be a bet with a metric and a target. Not for a choice between named options: "should we scan uploads inline on the request, or queue them to a worker?", "we already agreed uploads must be scanned, now it is a Postgres queue versus SQS" are veri:decide's, because what is open is which way to satisfy something already wanted. Not for ordinary work inside existing intent — "add a null check to parseDate", "write a unit test for globToRegExp".
requires: [file_requirement, amend_document, search, get_neighbors, get_intent]
upstream: veri/define
created: 2026-08-27
updated: 2026-09-01
links:
  - { id: WF-001, rel: derived-from }
  - { id: SRC-060, rel: derived-from }
  - { id: REQ-040, rel: serves }
  - { id: REQ-032, rel: constrained-by }
  - { id: REQ-038, rel: constrained-by }
  - { id: REQ-041, rel: constrained-by }
  - { id: DEC-125, rel: constrained-by }
  - { id: DEC-130, rel: constrained-by }
  - { id: REQ-008, rel: constrained-by }
---
## Purpose

The stretch between a want and a requirement: what must be true, typed
honestly as constraint or bet, carrying criteria a stranger could
check. The difficulty sits in one place: the user already believes
their requirement is clear — the pressure is scepticism about the
words, not the want.

## What it reads

- **`get_intent(<path>)`** when the want names code — governed code
  usually means a refinement, not a new requirement.
- **`search`/`get_neighbors`** — neighbours, constraining decisions,
  evidence: what turns "new" into "this refines [[REQ-033]]".
- **The evidence, where any exists** — a want with a source cites; one
  without is a bet, and the intuition-only advisory says so
  ([[REQ-038]]).
- **The pending block** — a draft in the area is amendable; an accepted
  one is neither ([[REQ-008]]). All through MCP ([[DEC-125]]).

## The interview

One orienting beat, three of pressure, a closing read-back, two
interrupts — the want is a fork, or contradicts approved intent.

1. **Say what already exists, before asking anything** — refinement (a
   `refines` link, narrower scope) or genuinely new.
2. **What must be true when this ships — observable how?** Asked again
   for every unobservable word, until a stranger could check it or
   beat 3 takes over.
3. **Constraint, or bet?** The two honest endings ([[REQ-032]]):
   observable criteria that must keep holding, or a hypothesis with
   metric, target and source of the number. A bet is not a demotion.
4. **What does this tension with, and what is explicitly out?** Named
   tensions become links; unnamed ones become an argument mid-diff.
5. **Read it back, then file** — statement, kind, criteria, links,
   out-of-scope: "correct me and I'll file after that."
6. **Interrupt — the want is really a fork.** Two named ways with
   different sacrifices → `veri:decide`; drafting it here would pick
   it.
7. **Interrupt — it contradicts accepted intent.** Never resolved here:
   supersede deliberately via `veri:decide`, or narrow one of the two.

## What it files

- **Draft requirements** (`file_requirement`) — statement, checklist
  criteria, beat 3's `kind` (plus `outcome` when a bet), links
  (`refines`, `constrained-by`, `derived-from`). `draft`, always.
- **Amendments to pending requirements** (`amend_document`) — better
  one revised twice than two nobody reconciles.
- **Nothing else** — no decisions (beat 6), no work orders (nothing
  approved).

Mechanical: `amend_document` is pending-only — it replaces title, body
and links of a *draft* requirement, *proposed* decision or *backlog*
work order, refuses approved or started ones, and carries no status or
approval field: the mechanical form of beat 7. `file_requirement`
carries `kind` and `outcome` in the one call; it refuses a kind outside
`constraint | hypothesis` and an outcome missing either half. A
hypothesis with no outcome files, reported as a check violation — get
the terms, never file the bet as a constraint, which raises no
untested-bet advisory ([[REQ-033]]): the laundering beat 3 refuses.

## Guardrails

- **Never drafts a constraint with untestable criteria** — "fast",
  "intuitive", "reliable" repeat until observable or the kind flips
  ([[REQ-032]]).
- **Never writes an `approved:` stamp.** Promotion is the user's act,
  always ([[REQ-008]], [[DEC-111]]). Everything here lands `draft`, and a
  draft steers nothing until the stamp lands.
- **Never touches an accepted requirement**, never files a draft that
  quietly opposes one.
- **Never picks a fork by writing it down** — a decision smuggled into
  intent.
- **Never invents an acceptance criterion the user did not agree to.**
- **Never duplicates a requirement it could amend** — `search` first.
- **A missing required tool is a refusal with a named repair** — intent
  in a transcript, or "what exists" from recall.

## Handoff

- **The user's approval pass, first and unconditionally** — a draft
  binds nothing until stamped: `veri approve`, or the app's review
  queue.
- **`veri:decide`** — a choice between real alternatives, including
  what beat 6 set aside.
- **`veri:plan-work`** — once accepted, the cut.
- **`veri:evidence-intake`** — a want resting on an unfiled
  observation; filing it closes the intuition-only advisory
  ([[REQ-038]]).
- **The hypothesis frontmatter edit** — same commit or the user's
  hands; the closing report says which.
