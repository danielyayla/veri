---
id: SRC-061
type: source
title: "Route — charting the Veri Skill Library from proposal to installable: the six open decisions"
status: imported
kind: investigation
created: 2026-08-27
updated: 2026-08-27
links:
  - id: SRC-060
    rel: derived-from
  - id: REQ-040
    rel: informs
  - id: REQ-041
    rel: informs
  - id: DEC-111
    rel: constrained-by
  - id: REQ-008
    rel: constrained-by
---

A wayfinding pass over the skill-library effort, charted 2026-08-27 against
[[SRC-060]], [[REQ-040]], [[REQ-041]], [[WF-001]], [[REQ-008]] and [[DEC-111]].

[[SRC-060]] settles *what the skills are* — fourteen skills in six categories
plus a Navigate layer, defaults marked against advanced, eight fields specified
per skill. This document charts what remains between that proposal and a library
a user can install, and deliberately does not re-open the roster.

The map lives here rather than on a parallel issue tracker: Veri is this repo's
tracker, and standing a second one beside it would contradict the thesis.

## Destination

The way is clear when every open decision below has been made and the library's
build is a queue of ready work orders. Writing the fourteen skills is not part
of this route — it is the work the route makes dispatchable.

## Already settled — not up for re-litigation

- **The skill roster and per-skill detail** — [[SRC-060]], with the full
  proposal published as a Claude artifact.
- **The promotion boundary** — nothing a skill files binds; the `approved:`
  stamp is the user's act alone ([[REQ-008]], [[DEC-111]]).
- **No orchestration layer** — handoffs are the document graph itself
  ([[SRC-060]] principle 3, [[WF-001]]).

## The frontier — open decisions, sharp enough to work now

**Distribution and install shape.** How a user actually installs the library:
a Claude Code plugin with a marketplace, an npm package under the `@verikb`
scope, something `veri init` writes into a project, or something the desktop
app carries. Prior art in the house style: [[DEC-069]] chose a bundled Node
action for the CI surface, and [[WO-091]] already contemplates `veri init`
starter bundles.

**Host portability — a scope boundary.** Skills are a Claude Code construct,
while Veri's agent door is MCP and host-agnostic. Whether v1 targets Claude
Code alone or needs a host-neutral carrier changes which distribution
alternatives are even live, so it is worth settling alongside the previous
question rather than after it.

**Canon duplication — how skills stay in sync with the workflow.** The skills
necessarily restate rules that already live in [[WF-001]], [[REQ-008]] and
[[DEC-111]]. Embedding those rules in skill text invites drift the moment the
workflow changes; fetching canon at runtime over MCP avoids drift but couples
every invocation to a running server. This is the largest long-term rot risk
on the map, and its answer shapes both the skills' text and their versioning.

**Relay approval — what constitutes a per-document user verdict over MCP.**
[[REQ-041]] flags this itself as the one item carrying a real design question.
It touches the promotion boundary directly, so it must not ship without a
decision recording how the user's act stays the user's. Best worked after the
canon-duplication question, since where the rules live determines where the
verdict is checked.

**The v1 proving ground.** [[REQ-040]]'s fourth acceptance criterion demands one
real project operated end-to-end through the skills. Veri itself is available
and self-hosted but circular as evidence; an external greenfield project is
honest but slower. This decides what would actually count as confirming the bet.

**The quality bar before shipping.** Whether the skills ship behind an eval
suite, and what triggering-accuracy floor they must clear. Mis-triggering skill
descriptions is the known failure mode for skill libraries, and [[REQ-040]]'s
refuting outcome — skills invoked once and abandoned — is partly a triggering
problem.

## Specifiable work, held pending the route

Three of [[REQ-041]]'s four gaps — document listing, queue introspection, and
structured receipts — are read-only, carry no promotion-boundary risk, and
depend on none of the open decisions above. They are dispatchable as work
orders whenever wanted; they are held here only to keep this route a planning
pass. The fourth gap, relay approval, is a frontier decision above.

## Not yet specified

- Authoring the fourteen skills' prompt text — shape depends on the
  distribution, portability and canon-duplication answers.
- The onboarding skill's graph-centrality tour algorithm.
- Versioning installed skills as [[WF-001]] evolves — depends on where the
  canon lives.
- Whether the six advanced skills ship in the same package as the eight
  defaults — depends on the distribution answer.

## Out of scope

- **Rewriting [[WF-001]]** — the skills staff the loop; they do not redefine it.
- **An orchestration layer sequencing skills** — [[SRC-060]] principle 3 rules
  it out; the document graph is the handoff.
- **Surfacing skills inside the desktop app** — `packages/ui` is design-gated
  per [[DEC-012]], and is a separate effort from the library itself.
