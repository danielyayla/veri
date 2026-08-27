---
id: SRC-060
type: source
title: "Design — the Veri Skill Library: installable skills that coach the full lifecycle loop"
status: imported
kind: design
created: 2026-08-27
updated: 2026-08-27
links:
  - id: DEC-111
    rel: informed-by
  - id: REQ-032
    rel: informed-by
  - id: REQ-033
    rel: informed-by
  - id: REQ-008
    rel: informed-by
---

The Veri Skill Library, as proposed. Published as a Claude artifact on
2026-08-27: https://claude.ai/code/artifact/335dd7dc-0cdc-45d0-817e-68f376591209

This document holds the proposal's content, not a summary of it. An
earlier revision held a paraphrase; two errors were found in the
paraphrase's counting that the content itself does not contain. See
**Editorial notes** at the end for what was corrected and why nothing in
the body was.

---

## The Veri Skill Library

A set of installable skills that coach a developer through the whole life of a
project — from "I have an idea" to years of maintenance — by making Veri's loop
the path of least resistance. The skills teach thinking, not commands: each one
runs a conversation at one of Veri's semantic gates, then files what emerged as
draft documents for the human to promote.

| Category | Scope |
| --- | --- |
| **Discover** | evidence & understanding |
| **Define** | requirements & intent |
| **Decide** | tradeoffs → decisions |
| **Build** | work orders → receipts |
| **Evaluate** | did it work? |
| **Maintain** | keep the graph true |

Six categories, mapped one-to-one onto [[WF-001]]'s loop: evidence →
understanding → intent → requirements → decisions → bounded work →
implementation → verification → learning → revised intent. A seventh,
cross-cutting skill — the Wayfinder — is the front door that routes into any of
them.

## Design principles

Three design principles, inherited from [[DEC-111]] and [[REQ-008]]:

1. **Skills interview; humans decide.** Every artifact a skill creates lands as
   `draft`/`proposed`. No skill ever writes an `approved:` stamp — promotion is
   `veri approve`, the user's act, always.
2. **Skills sit at semantic gates, not at every action.** Each skill owns
   exactly one gate (interpret evidence, accept a requirement, choose a
   tradeoff, judge an outcome). Between gates, the agent just works.
3. **Every skill ends by naming the next gate.** Handoff is explicit: "these
   three requirements are drafted; when you've approved them, run
   `/veri:plan-work`." The library composes because the seams are the document
   graph itself.

## Navigate

> "I don't know which workflow I need — I just know what's on my mind."

### `veri:wayfinder` — ships by default

The front door. Takes any vague utterance — "what should I work on next?", "I
want to change auth", "why is search built this way?" — classifies which gate it
belongs to, shows the user where they are in the graph, and routes to the right
skill with context pre-loaded.

- **Invoke when** — Any session start without a claimed work order; any question
  that names a goal but not a document. Other skills also fall back to it when a
  conversation drifts outside their gate.
- **Reads** — `get_intent` (the project's current product intent), the
  ready/backlog queue, in-progress claims (`claimed_by`), `run_check`
  advisories, and `search`/`get_neighbors` over whatever the user mentioned.
- **Asks** — "Is this a new idea, a change to existing behavior, a question
  about the past, or picking up queued work?" — one triage question, then it
  stops asking and starts showing: the relevant subgraph, what's approved vs.
  proposed, what already touches this area.
- **Creates** — Nothing. Wayfinder is deliberately read-only — it orients and
  routes.
- **Needs** — `get_intent`, `search`, `get_neighbors`, `run_check`; wants a
  `list_documents(status=…)` / queue query (today only `veri next` in the CLI —
  see the capability-gap table).
- **Guardrails** — Never starts implementation. If the user says "just do it,"
  Wayfinder names the missing document ("there's no work order for this") and
  routes to the skill that creates one — [[WF-001]] rule 1, made conversational.
- **Hands off to** — Any skill below, with the relevant document IDs already
  gathered. This is the only skill that hands off to all of them.

### `veri:archaeology` — advanced

Answers "why is it like this?" by walking the graph backwards: implementation →
receipt → work order → decision → requirement → source. Turns Veri's link
structure into an explanation with citations, and flags where the recorded
rationale has drifted from the code.

- **Invoke when** — "Why did we…", "who decided…", "what was the alternative
  to…", onboarding a new contributor, or before proposing to change something
  old.
- **Reads** — `get_neighbors` transitively from the artifact in question; the
  rejected-alternatives sections of DECs; superseded chains (`superseded_by`);
  git history around receipt SHAs.
- **Asks** — Only clarification of the target ("the auth flow or the auth
  storage?"). This skill mostly answers.
- **Creates** — Optionally: a draft SRC capturing rationale it had to
  reconstruct from code/git because no document recorded it — turning
  archaeology into backfill.
- **Needs** — `get_neighbors`, `get_document`, `search`, git log access,
  `file_source`.
- **Guardrails** — Distinguishes recorded rationale (cited by ID) from inferred
  rationale (clearly labeled as reconstruction). Never presents inference as
  record.
- **Hands off to** — `veri:decide` if the user concludes the old decision should
  be revisited (supersession, never silent edit); `veri:health` if it uncovered
  systemic drift.

## Discover

> "I have an idea" / "something happened in the world" — get it in through the
> evidence door.

### `veri:product-discovery` — ships by default

Turns a vague idea into a defined problem, a direction, named assumptions, and
the first explicit bets. This is the skill that makes an empty Veri project
usable — it produces the seed documents everything else grows from.

- **Invoke when** — A new or nearly-empty project; a pivot; "I have an idea
  for…" with no documents behind it.
- **Reads** — Whatever exists: README, any prior SRCs, `get_intent`. In a fresh
  repo, nothing — that's the point.
- **Asks** — Socratic, one at a time: What breaks or hurts today, for whom,
  concretely? What happens if nobody builds this? What's the smallest version
  that would prove the idea has legs? Which of your beliefs, if wrong, kills the
  project? What are you explicitly not building?
- **Creates** — A product-brief SRC (problem, direction, non-goals); one draft
  REQ per foundational bet, `kind: hypothesis`, each with a confirming/refuting
  outcome named ([[REQ-032]]'s discipline applied from day one).
- **Needs** — `file_source`, `file_requirement`, `get_intent`.
- **Guardrails** — Refuses to emit a requirement whose evidence is only the
  user's enthusiasm without labeling it a hypothesis. Assumptions the user won't
  commit to testing stay in the SRC as open questions, not requirements.
- **Hands off to** — `veri:user-discovery` when the target user is fuzzy;
  otherwise straight to `veri:define` once the brief is approved.

### `veri:user-discovery` — advanced

Pins down who the users are, their jobs-to-be-done, pains, and — crucially —
what is known vs. assumed about them. Produces a research agenda, not just
personas.

- **Invoke when** — Product-discovery couldn't name a user concretely; before a
  feature whose value depends on user behavior; when evidence contradicts the
  current user model.
- **Reads** — The product-brief SRC, any evidence SRCs (interviews, tickets,
  analytics imports), hypothesis REQs with `rel tests` links.
- **Asks** — Who has this job today and what do they do instead? Which claims
  here have you observed and which have you imagined? What would you need to see
  to abandon this segment? What's the cheapest way to learn each unknown?
- **Creates** — A user-model SRC (segments, JTBD, pains, each tagged
  known/assumed with its evidence link); a research-questions SRC; optionally
  hypothesis REQs for load-bearing assumptions.
- **Needs** — `file_source`, `file_requirement`, `search`, `get_neighbors`.
- **Guardrails** — Every claim in the user model must carry either a `[[SRC-…]]`
  citation or an explicit `assumed` tag. The skill will not launder assumption
  into fact.
- **Hands off to** — `veri:evidence-intake` when research comes back;
  `veri:define` for assumptions promoted to testable requirements.

### `veri:evidence-intake` — ships by default

The evidence door, staffed. Takes anything from outside — user feedback,
metrics, a support ticket, a competitor move, an incident, research findings —
and files it as a source correctly linked to what it tests, so evidence lands on
the graph instead of in a drawer.

- **Invoke when** — The user pastes/points at external material; after a
  hypothesis's work orders ship and results arrive; when `run_check` shows
  untested-bet advisories.
- **Reads** — The material itself; `search` for the requirements and decisions
  it plausibly bears on; `get_import_instructions` for format.
- **Asks** — "This looks like it bears on REQ-021 — does it support or refute
  it?" "Is this one observation or a pattern?" "Does this change your confidence
  in any active decision?"
- **Creates** — SRC documents with `rel tests`/`supports`/`refutes` links to
  requirements and `outcome-of` links to work orders ([[REQ-033]] / [[DEC-113]]
  conventions).
- **Needs** — `file_source`, `search`, `get_neighbors`,
  `get_import_instructions`, `run_check`.
- **Guardrails** — Files evidence verbatim-faithful; interpretation ("so we
  should retire REQ-021") is proposed in conversation, never encoded into the
  source. Judging what evidence means stays the user's act, per [[WF-001]]
  rule 9.
- **Hands off to** — `veri:did-it-work` when the evidence answers a shipped
  hypothesis; `veri:define` or `veri:decide` when it demands revised intent.

## Define

> "I know roughly what I want" — turn thinking into requirements worth
> approving.

### `veri:define` — ships by default

Requirements discovery as an interview. Instead of asking the user to write
requirements, it interrogates a feature idea until the requirement writes itself
— then drafts it, correctly typed as constraint or hypothesis, with acceptance
criteria a machine could check.

- **Invoke when** — "I want to add/change X"; after Discover produces an
  approved brief; when planning reveals a work order with no requirement behind
  it.
- **Reads** — Existing REQs in the area (`search`), constraining DECs, the
  intent summary, relevant SRC evidence.
- **Asks** — The gate questions: What must be true when this ships — observable
  how? Is this something that must stay true (constraint) or a bet on an outcome
  (hypothesis — then: which metric, what target, by when)? What existing
  requirement does this tension with? What's out of scope?
- **Creates** — Draft REQs with `kind`, acceptance criteria, and links
  (`refines`, `constrained-by`, evidence rels); amendments to existing draft REQs
  via `amend_document`; flags conflicts with accepted REQs rather than editing
  them.
- **Needs** — `file_requirement`, `amend_document`, `search`, `get_neighbors`,
  `get_intent`.
- **Guardrails** — Won't draft a constraint with untestable criteria ("fast",
  "intuitive") — it pushes until criteria are observable or the kind flips to
  hypothesis. Never touches an accepted requirement; revision of approved intent
  routes through the user explicitly.
- **Hands off to** — The user's approval pass; then `veri:decide` if the
  requirement forces a choice, else `veri:plan-work`.

## Decide

> "There's more than one way to do this" — make the tradeoff on purpose and on
> record.

### `veri:decide` — ships by default

The decision guide. Recognizes when a genuine decision point has been reached
(in conversation, in planning, mid-implementation), forces real alternatives onto
the table, pressure-tests them against requirements, and files the choice as a
proposed DEC with the rejected paths recorded.

- **Invoke when** — The user asks "should we X or Y?"; another skill hits a fork
  it isn't licensed to pick; an existing active DEC is being questioned (→
  supersession, never edit).
- **Reads** — The requirements the decision must serve; neighboring active DECs
  it must not contradict; prior superseded chains in the same area.
- **Asks** — What are we actually optimizing — and what are we knowingly
  sacrificing? What are at least two real alternatives (a strawman doesn't
  count)? What would make us revisit this? Which requirements does each option
  strain?
- **Creates** — Proposed DECs with context, options considered, tradeoff
  rationale, and revisit conditions; for reversals, a new DEC linking
  `supersedes` with `superseded_by` set on approval.
- **Needs** — `file_decision`, `search`, `get_neighbors`, `get_document`.
- **Guardrails** — Presents tradeoffs symmetrically before any recommendation.
  Files only as `proposed`. Refuses to fold a decision silently into a work
  order's prose — if it's a choice, it's a DEC.
- **Hands off to** — User approval; then back to whichever skill surfaced the
  fork — planning resumes, or implementation un-pauses.

### `veri:approval-session` — advanced

Makes the human gate pleasant. Gathers everything awaiting the user's stamp —
draft REQs, proposed DECs, ready-gates — presents each with its evidence trail
and what approving it will unblock, and walks the user through an efficient
approve/amend/withdraw pass.

- **Invoke when** — End of a working batch; "what's waiting on me?"; before
  `veri:plan-work` when its inputs are unapproved.
- **Reads** — All `draft`/`proposed` documents and their subgraphs; `run_check`
  for what each promotion unblocks or breaks.
- **Asks** — Per document, exactly one question: approve as-is, amend (then
  what?), park, or withdraw? Presents consequences, not persuasion.
- **Creates** — Amendments the user dictates (`amend_document`); the approval
  commits themselves follow the user's stamp. It never runs `veri approve` on
  its own initiative — only relays the user's explicit per-document verdict.
- **Needs** — Document listing by status (gap!), `amend_document`, `run_check`,
  CLI `veri approve`/`veri withdraw` driven strictly by user verdicts.
- **Guardrails** — The one skill nearest the stamp, so the strictest: no
  batching without explicit instruction, no "approve all", verdicts echoed back
  before any command runs, stamps committed with the required commit-subject
  convention.
- **Hands off to** — `veri:plan-work` — approval is precisely what makes work
  plannable.

## Build

> "Intent is approved" — cut it into bounded work and execute inside the lines.

### `veri:plan-work` — ships by default

Turns approved requirements and decisions into small, independently shippable
work orders with real acceptance criteria — the discipline of scope cutting
(what's the thinnest slice that's still verifiable? what's explicitly out?)
applied before any agent touches code.

- **Invoke when** — A requirement is newly accepted; a big WO needs splitting;
  the backlog is empty but intent isn't.
- **Reads** — The accepted REQs and active DECs being planned against; existing
  WOs (avoid overlap); module map from [[WF-001]]; `design_gate_paths`.
- **Asks** — Can each proposed WO be verified alone? What's the first slice that
  touches reality? Which acceptance criterion proves which requirement clause?
  Does this touch a design-gated path — and is the design done?
- **Creates** — Backlog WOs with in-scope / out-of-scope / acceptance tests and
  links to every binding document; `binds: paths:` declarations for gated paths;
  sequencing notes.
- **Needs** — `file_work_order` (with its `in_scope`/`out_of_scope`/
  `acceptance_tests` params), `amend_document`, `search`, `run_check`.
- **Guardrails** — Every acceptance criterion must trace to a requirement clause
  or be justified as scaffolding. WOs land in `backlog` — only the user's
  `veri approve` makes them `ready`. A WO on a gated path without a `designed-by`
  link gets the design step planned first, per [[DEC-012]].
- **Hands off to** — User approval (backlog → ready), then `veri:implement` via
  `veri next`.

### `veri:implement` — ships by default

Implementation steering — [[WF-001]]'s implementer rules as a live discipline,
with a Pocock-style orientation preamble. Before code: where are we, what exactly
are we trying to accomplish, what context does the agent need, what's the next
sensible step? During code: scope guarding, decision surfacing, receipt keeping.

- **Invoke when** — Starting a ready work order; resuming an in-progress claim;
  whenever the user says "build it."
- **Reads** — The full context package (`get_context`): the WO, every linked
  REQ/DEC/SRC in full, [[WF-001]] itself.
- **Asks** — At the start: confirms its reading of scope back to the user in one
  paragraph. During: only when it hits a fork (→ spawn `veri:decide`) or
  discovers the scope is wrong (→ stop, propose a WO amendment, never quietly
  widen).
- **Creates** — Code; proposed DECs for non-trivial choices made en route;
  receipts appended per session (date, SHA, files, summary); the
  `start_work_order` claim and its commit.
- **Needs** — `start_work_order`, `get_context`, `file_decision`, `file_receipt`,
  `run_check`, git.
- **Guardrails** — The full [[WF-001]] rule set: no coding from chat alone;
  out-of-scope is forbidden even when easy; one session / one WO / one worktree;
  claims checked before starting; disagreement with a linked DEC means
  stop-and-say-so, never silent deviation; `done` requires all criteria checked
  and a receipt and zero check violations.
- **Hands off to** — `veri:did-it-work` — a receipt says the code exists; it
  doesn't say the bet paid off.

## Evaluate

> "The code shipped" — was that success, or just motion?

### `veri:did-it-work` — ships by default

The learning gate. After work orders ship, it separates three questions that lazy
retrospectives blur: did we build what we said (acceptance criteria)? does it
hold what must hold (constraints)? and did the bet pay off (hypotheses —
measured against the outcome each one declared)? Then it files reality's answer
where the graph can see it.

- **Invoke when** — A hypothesis's WOs are all done; `run_check` shows
  untested-bet advisories; the user asks "did the thing we shipped last month
  actually help?"
- **Reads** — The hypothesis REQ and its declared metric/target; the shipping WOs
  and receipts; any outcome evidence already filed; test results.
- **Asks** — What did the metric do? Is that signal or noise? If refuted: retire,
  revise, or re-bet? If confirmed: does the hypothesis harden into a constraint
  that must now stay true?
- **Creates** — Outcome SRCs (`rel tests`/`supports`/`refutes` + `outcome-of`);
  proposed follow-ups — a revised REQ draft, a retirement recommendation, a
  hypothesis→constraint promotion draft. The verdict itself is never
  auto-applied.
- **Needs** — `file_source`, `file_requirement`, `get_neighbors`, `run_check`;
  benefits from metric/analytics import paths.
- **Guardrails** — [[WF-001]] rule 9 verbatim: outcome evidence never
  auto-changes the requirement. The skill computes and presents; the user judges.
  It also refuses "it shipped, so it worked" — absence of outcome evidence is
  reported as untested, not confirmed.
- **Hands off to** — `veri:define` (revise intent) or `veri:evidence-intake`
  (more data needed) — closing [[WF-001]]'s loop back to its top.

### `veri:review` — advanced

Spec-fidelity code review: examines a diff or branch against the work order that
produced it — scope respected? every acceptance criterion genuinely met, not just
checked? linked decisions honored? undeclared decisions smuggled in as code?

- **Invoke when** — Before marking a WO `done`; before merging an agent's
  branch; periodically over recent receipts.
- **Reads** — The diff, the WO and its full linked context, the receipts,
  `run_check`.
- **Asks** — Little — it reports. Findings are framed as questions only where the
  spec itself is ambiguous ("the WO says 'fast' — the code caches; was that the
  intent?").
- **Creates** — A findings report; proposed DECs for choices found in code but
  absent from the record; proposed WO amendments where scope and reality
  diverged.
- **Needs** — `get_context`, git diff access, `file_decision`, `run_check`.
- **Guardrails** — Reviews against the record, not the reviewer's taste — a
  finding must cite the REQ/DEC/WO clause it violates. Taste findings are labeled
  as such and filed separately.
- **Hands off to** — `veri:implement` for fixes; `veri:decide` for the smuggled
  decisions.

## Maintain

> "Months later" — keep the knowledge base something you can still trust.

### `veri:health` — ships by default

The periodic inspection. Sweeps the whole graph for decay that `veri check`'s
hard rules don't catch: requirements untouched for months while their code
churned, decisions whose revisit conditions have arrived, abandoned in-progress
claims, stale sources, hypotheses nobody measured, orphan documents nothing links
to, drift between spec and implementation.

- **Invoke when** — On a schedule (weekly/monthly, e.g. via a scheduled task);
  after big pushes; "how healthy is this project?"
- **Reads** — The entire document set with statuses and timestamps; `run_check`
  (violations and advisories); git activity vs. document `updated:` dates; claim
  ages.
- **Asks** — Nothing up front — it reports first, triaged by severity, then asks
  only "which of these do you want to act on?"
- **Creates** — A health-report SRC (so trends are comparable over time);
  proposed maintenance WOs for the items the user picks; withdrawal
  recommendations — executed only on the user's word.
- **Needs** — `run_check`, document listing/statistics (gap!), git log,
  `file_source`, `file_work_order`.
- **Guardrails** — Strictly propose-only: a maintenance sweep that auto-mutates
  the record would destroy exactly the trust it exists to protect. Staleness
  heuristics are labeled heuristics.
- **Hands off to** — `veri:did-it-work` for the untested bets; `veri:archaeology`
  for suspicious old areas; `veri:plan-work` for accepted maintenance items.

### `veri:onboard` — advanced

Gives a new contributor (human or a newly configured agent) a guided tour built
from the record itself: the intent, the load-bearing decisions, the active bets,
the workflow rules — then walks them through claiming their first small work
order.

- **Invoke when** — A new person or agent joins; the user returns after months
  away.
- **Reads** — `get_intent`, [[WF-001]], the most-linked DECs and REQs (graph
  centrality as a curriculum), the ready queue.
- **Asks** — The newcomer's role and what they'll touch first, to slice the tour.
- **Creates** — Nothing in `veri/`; optionally a tour artifact. Deliberately
  read-only.
- **Needs** — `get_intent`, `get_neighbors`, `search`.
- **Guardrails** — Teaches the gates before the tools — a newcomer must learn
  that promotion is human-only before learning any command that files documents.
- **Hands off to** — `veri:implement` on a starter work order.

## The library at a glance

| Category | Skill | Gate it staffs | Tier |
| --- | --- | --- | --- |
| Navigate | `veri:wayfinder` | routing — which gate am I at? | default |
| Navigate | `veri:archaeology` | understanding the past | advanced |
| Discover | `veri:product-discovery` | idea → problem & bets | default |
| Discover | `veri:user-discovery` | who is this for, really | advanced |
| Discover | `veri:evidence-intake` | reality → the evidence door | default |
| Define | `veri:define` | interpreting intent into requirements | default |
| Decide | `veri:decide` | choosing tradeoffs | default |
| Decide | `veri:approval-session` | the stamp itself | advanced |
| Build | `veri:plan-work` | intent → bounded work | default |
| Build | `veri:implement` | execution within intent | default |
| Evaluate | `veri:did-it-work` | judging outcomes | default |
| Evaluate | `veri:review` | spec fidelity of code | advanced |
| Maintain | `veri:health` | trust in the record over time | default |
| Maintain | `veri:onboard` | bringing newcomers inside the loop | advanced |

Eight defaults form a complete minimal loop: wayfinder → product-discovery →
define → decide → plan-work → implement → did-it-work → health, with
evidence-intake feeding every stage. The six advanced skills deepen individual
gates without being required to operate the loop.

## Capability gaps the skills expose

Most skills run on today's MCP surface (`get_context`, `get_intent`, `search`,
`get_neighbors`, `get_document`, the create-only `file_*` family,
`amend_document`, `start_work_order`, `run_check`). Four gaps recur:

| Gap | Needed by | Shape |
| --- | --- | --- |
| List/query documents by status, type, age | wayfinder, approval-session, health | `list_documents({type?, status?, updated_before?})` |
| Queue introspection (`veri next` over MCP) | wayfinder, implement | `get_queue()` → ready WOs in order, plus claims |
| Receipt→git correlation | health, review, archaeology | expose receipt SHAs structurally, not just as prose |
| Relay-approval affordance | approval-session | an approve path that requires an explicit per-document user verdict token — keeping the stamp human while letting the skill run the mechanics |

Each of these is itself a candidate requirement — which is fitting: the first
real test of the skill library is filing its own prerequisites through
`veri:define`.

## Editorial notes

The body above is the proposal as written. Nothing in it has been altered, on
the [[REQ-033]] posture this project applies to evidence generally: a source
records what was said, and interpretation belongs in the documents that cite it,
not folded back into the record.

Two counting problems in the proposal are known and are corrected *here* rather
than in the body:

1. **"The six advanced skills"** is wrong. The at-a-glance table and the skill
   cards both give **five**: archaeology, user-discovery, approval-session,
   review, onboard.
2. **"Eight defaults"** is a loose label for a true statement. The eight it then
   names are the loop's *chain*, and the sentence itself says evidence-intake
   feeds every stage rather than occupying one. Evidence-intake is nonetheless
   `default` tier — its own card says "ships by default", the table says
   `default`, and [[REQ-040]] enumerates it among the nine. **Nine skills ship
   by default; eight of them are links in the chain.**

For anything that turns on tiering — which shells a default install emits — the
authority is [[REQ-040]]'s enumerated list, not prose in this document. An
earlier revision of this source held a paraphrase of the proposal rather than its
content, and both of the above were miscopied into it in ways the content does
not contain; that is the reason this document now holds the content itself.
