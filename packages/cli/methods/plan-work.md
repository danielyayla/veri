---
id: MET-007
type: method
title: "veri:plan-work — approved intent cut into work somebody can verify alone"
status: accepted
approved: 2026-08-28
description: >-
  The gate between approved intent and work orders somebody could verify
  one at a time. Use it when intent is settled and nothing is queued
  against it: "REQ-014 is accepted — cut it into work orders", "the
  backlog is empty but REQ-039 and REQ-041 are both accepted, turn them
  into work", "start building the CSV export, there is no work order for
  it yet", "this one is too big to verify in one go, split it into slices
  that each ship on their own". It reads what is already accepted and
  already queued, pushes each slice until it can be proven alone, ties
  every acceptance criterion to the requirement clause it proves, and
  files the work orders in backlog awaiting your stamp. Not for work
  inside a boundary already drawn: "WO-131 is ready — start it", "pick up
  my in-progress claim on WO-118 and keep going where I left off" are
  veri:implement's, because the lines exist and what is left is
  execution. Not for ordinary work with no boundary in question — "run
  the test suite", "the CI matrix is failing on Node 18, fix it".
requires:
  - file_work_order
  - amend_document
  - search
  - get_neighbors
  - run_check
upstream: veri/plan-work
created: 2026-08-27
updated: 2026-09-01
links:
  - id: WF-001
    rel: derived-from
  - id: SRC-060
    rel: derived-from
  - id: REQ-040
    rel: serves
  - id: DEC-012
    rel: constrained-by
  - id: DEC-114
    rel: constrained-by
  - id: DEC-125
    rel: constrained-by
  - id: DEC-130
    rel: constrained-by
  - id: REQ-008
    rel: constrained-by
---

## Purpose

This gate is the stretch between intent the user has approved and work an
agent could pick up, execute and prove without asking what was meant. It
draws boundaries; everything downstream of it works inside them.

What the user gets from it: scope discipline applied while it is still
cheap. A boundary written here costs a line. The same boundary discovered
mid-implementation costs the diff, and is discovered by whichever agent
was in the middle of exceeding it ([[MET-001]] beat 6).

Its characteristic failure is a work order that reads well and cannot be
verified — "improve the importer", with three criteria none of which
anyone could check alone. That document will be approved, claimed, and
then argued about at the end by whoever is tired.

## What it reads

- **The accepted requirements and active decisions being planned
  against**, via `search` and `get_neighbors`. What must be true, and what
  the choices already made forbid. Planning against something still
  pending is planning work that cannot be started.
- **The work orders already touching this area.** Two work orders cutting
  the same slice is a collision nobody notices until two sessions claim
  them ([[WF-001]] rule 8). Where `list_documents` and `get_queue` are on
  the connected tool list they answer this better than `search`: what is
  ready, what is claimed, and by whom.
- **[[WF-001]]'s own frontmatter** — the module map and the
  `design_gate_paths` list, read rather than remembered: the gated paths
  are per-project and they change.
- **`get_intent(<path>)` when the intent names code**, for what already
  governs the files a slice would touch, and **the pending block** — a
  draft requirement is context, not intent to cut against as though it
  were settled ([[REQ-008]]).

All of it through the MCP tools ([[DEC-125]]): no reading `veri/` off
disk, no shelling out to the CLI.

## The interview

**One orienting beat, two of pressure, one conditional gate beat, a
read-back, and two interrupts — one when the intent is not approved yet,
one when the cut reaches a fork.** The pressure is entirely about
boundaries: this gate does not reopen whether the thing should be done,
only whether each piece of it can be proven on its own.

1. **Say what is accepted and what is already queued, before cutting
   anything.**

   > "[[REQ-040]] is accepted and [[DEC-125]] constrains how. Three work
   > orders already touch this area — [[WO-132]] is done, [[WO-135]] is
   > in backlog. What I cut has to sit beside those rather than overlap
   > them."

   A different answer changes the act: an area already carrying queued
   work gets an amendment or a re-slice, not a new work order.

2. **Can each slice be verified alone?** The load-bearing beat, and it
   repeats:

   > "If this one shipped and nothing else did, what would you look at to
   > say it worked? If the answer needs the next slice too, that is one
   > work order, not two."

   It ends when every slice carries its own proof, or when slices that
   cannot be separated are merged back into one.

3. **Which acceptance criterion proves which requirement clause — and
   what is explicitly out?** Both halves, because both are boundaries:

   > "Criterion 2 proves [[REQ-040]]'s clause about <what>. Criterion 3
   > proves nothing in the requirement, so it is scaffolding and I will
   > say so. Now name what a reasonable implementer would assume is
   > included here and must not be."

   A criterion tracing to no clause is either scaffolding, declared, or
   it is scope nobody approved arriving through the back door.

4. **The design gate — conditional.** Fires when a slice would touch a
   path in [[WF-001]]'s `design_gate_paths`:

   > "That slice lands on <the gated path>. It can be planned now, and it
   > cannot be *started* until a design document exists and this work
   > order links it `designed-by` ([[DEC-012]], [[WF-001]] rule 7). Two
   > ways to sequence it: cut the design step as its own work order
   > first, or cut this one now with the path declared and the design
   > named as its blocker."

   The precision matters. The gate is a precondition on starting, not on
   planning, and overstating it would stop this gate doing its job at
   exactly the moment design-first work needs planning.

5. **Read the cut back, then file.**

   > "<n> work orders. First: <one line>, proven by <criterion>, out:
   > <exclusions>. Second: <one line> … First before second because
   > <why>. Each lands in backlog, none startable until you approve it.
   > Correct me and I'll file after that."

6. **Interrupt — when the intent is not approved yet.** Not a refusal, a
   disclosure:

   > "[[REQ-041]] is still draft. I can cut against it — a backlog work
   > order may cite a pending document, so a proposal and its work review
   > as one package — but nothing here starts until that requirement is
   > accepted, and if it changes under review the cut changes with it.
   > Say whether you want the cut now or after the stamp."

7. **Interrupt — when the cut reaches a fork.** Fires when two orderings
   or two shapes are both plannable and sacrifice different things:

   > "Cutting this needs a choice, and I'd be making it by writing one of
   > them down. `veri:decide` owns the fork; I'll resume the cut with the
   > decision id in hand."

## What it files

- **Backlog work orders, via `file_work_order`** — title, summary,
  `in_scope`, `out_of_scope`, `acceptance_tests`, and links to every
  document that binds the work. Status `backlog`, and the tool hardcodes
  it: there is no status parameter to send — every filing starts in
  backlog, awaiting the user's dispatch.
- **Amendments to backlog work orders, via `amend_document`**, when beat
  1 found the slice already cut. Better one work order revised twice than
  two nobody reconciles.
- **Nothing else.** No requirements — a cut that discovers the intent
  does not say enough hands back to `veri:define`. No decisions — beat 7
  exists so this gate does not choose by writing a choice down.

**Three mechanical facts about the surface, verified against
`packages/mcp/src/server.ts` and `packages/core/src/check.ts` on
2026-08-27:**

- **Every start-time gate is exempt in backlog, and that exemption is the
  shape of this whole gate.** A work order linking no requirement, one
  citing a pending document, and one declaring a gated path with no
  design all pass `veri check` while they sit in backlog, and all three
  fail the moment the work starts (`wo-without-requirement`, `gated-wo`,
  `ui-wo-without-design`). Planning is therefore free to run ahead of the
  stamp. What it must not do is leave a work order that will fail on the
  day somebody claims it — so the read-back names, per work order, which
  gate it is still waiting on.
- **`binds: paths:` has no `file_work_order` parameter.** The tool takes
  title, summary, the three boundary sections and links, and its strict
  schema refuses anything else. So the declaration [[DEC-114]] reads as
  issue-tier evidence — the affirmative claim that this work touches a
  gated path — has no MCP path. Following [[MET-001]]'s handling of the
  closing flip: never invent the capability, never let the omission pass.
  Name the paths in the work order's In scope, show the exact frontmatter
  edit —

  > ```
  > binds:
  >   paths:
  >     - <the gated path>
  > ```

  — and either apply it as the ordinary file edit it is, in the same
  commit as the filing, or hand it to the user when the session cannot
  write to the repository. Say which happened. An undeclared gated path
  is caught later only by the diff tier, and only after a commit has
  already landed on it ([[DEC-114]]) — which is after the work was done
  without the design.
- **`amend_document` is pending-only** — for work orders that means
  unstamped `backlog`, and it refuses stamped, in-progress and done ones
  outright. So
  splitting a work order the user already approved is not this gate's
  edit: file the new slices as fresh backlog work orders and hand the
  narrowing edit over, as [[MET-001]] does with a claimed work order.

## Guardrails

Every refusal names what is missing and what would fix it. A skill that
cannot file what it collected refuses rather than degrading
([[DEC-125]]).

- **Never writes an `approved:` stamp.** Promotion is the user's act,
  always ([[REQ-008]], [[DEC-111]]). Everything here lands `backlog`, and
  a backlog work order authorises nothing. *"Four work orders are filed.
  None of them is startable until you approve them."*
- **Never files a work order that cannot be verified alone.** Beat 2
  repeats until it can, or the slices merge. *"I can write that down, but
  nobody could tell you whether it shipped without also shipping the next
  one."*
- **Never starts what it just cut** ([[WF-001]] rules 1 and 8). Cutting
  the work and claiming it are two acts with the user's stamp between
  them, and the temptation is strongest exactly when the plan is fresh.
  *"The work order exists now. Starting it is `veri:implement`'s act,
  after your approve."*
- **Never plans past the design gate.** A slice on a gated path is
  planned with its blocker named, or the design step is planned first
  ([[DEC-012]]). *"I can cut this. Nobody can start it until a design
  exists and this work order links it."*
- **Never invents an acceptance criterion the requirement does not ask
  for**, and never leaves one untraced without calling it scaffolding:
  criteria are what "done" is argued against later.
- **Never widens a slice to fill a work order**, and never files an empty
  Out of scope because nothing came to mind: what was not excluded will
  be attempted.
- **Never edits an approved work order**, and never re-scopes one quietly
  by filing a second that overlaps it.
- **A missing required tool is a refusal with a named repair.** Without
  `file_work_order` this gate produces a plan that exists only in a
  transcript; without `search` or `get_neighbors` every claim about what
  already exists is recall wearing a citation.

## Handoff

One unconditional exit, then the successors the cut's own shape selects:

- **The user's dispatch comes first, always.** A backlog work order is
  cleared and started by `veri dispatch <WO-id> --as <session>` — the
  approval stamp and the claim in one gesture ([[DEC-143]]). This is the
  one step of the sequence no skill performs ([[REQ-008]]).
- **`veri:implement`** — once the user dispatches, one session per work
  order, taken in the order the queue is dispatched. The condition is
  simply that nothing else is outstanding against them.
- **The design first, when beat 4 fired.** The design is produced,
  committed as a source, approved, and linked `designed-by` before the
  work order is started ([[DEC-012]]). Until that lands the slice stays
  where it is, however ready the rest of it looks.
- **`veri:decide`** — when beat 7 fired. What waits there is a proposed
  decision, and it waits for the same stamp; the cut resumes with its id.
- **`veri:define`** — when the cut showed the intent does not say enough
  to be cut. A requirement whose clauses no criterion could prove is not
  a planning problem.
- **The frontmatter edit for every gated declaration** is in the same
  commit as the filing or in the user's hands, and the closing report
  says which. An undeclared gated path is a work order that will pass its
  pre-flight check and should not have.
