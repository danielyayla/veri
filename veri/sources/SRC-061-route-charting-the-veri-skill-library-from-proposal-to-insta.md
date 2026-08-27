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
  - id: DEC-125
    rel: informs
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

## Walked so far

**Distribution, host portability, and where the coaching method lives** — closed
by [[DEC-125]] (2026-08-27). The method lives in `veri/` as Veri documents,
harness-agnostic and travelling in the context package; the harness-native skill
file is a generated thin pointer, the same relationship [[DEC-018]] already gave
`AGENTS.md` and `CLAUDE.md`. Method documents are owned by the project once
scaffolded and upgraded by proposal, so improvements reach running projects
without overwriting local tuning. [[DEC-126]] reached the opposite answer
concurrently and is withdrawn; its mechanical conclusions were carried into
[[DEC-125]].

That single decision closed two of the six frontier items below and substantially
answered a third: the canon-duplication question is settled as to *where* the
canon lives and how it propagates. Its residue — how far a method document may
restate [[WF-001]]'s rules before the two can disagree — is smaller than the
original question and is left for the authoring work.

**Relay approval** — closed by [[DEC-127]] (2026-08-27), which satisfies
[[REQ-041]] item 4's requirement that this ship only behind a decision. The
walk's finding was that the boundary had been named wrongly: "keeping the stamp
human" reads as access control, but any agent that can write files can write an
`approved:` stamp that `veri check` accepts. Named correctly as *deliberateness*,
the design collapsed to something small — one gate, one document per call, the
exact frontmatter edit visible in the call, identity collected from git rather
than claimed by the agent, and a refusal in [[DEC-071]]'s strict team tier. Two
limits are recorded rather than papered over: auto-approve hosts bypass the
ceremony, and presentation before a verdict is skill discipline the decision
cannot enforce.

## The frontier — open decisions, sharp enough to work now

**The v1 proving ground.** [[REQ-040]]'s fourth acceptance criterion demands one
real project operated end-to-end through the skills. Veri itself is available
and self-hosted but circular as evidence; an external greenfield project is
honest but slower. This decides what would actually count as confirming the bet.

**The quality bar before shipping.** Whether the skills ship behind an eval
suite, and what triggering-accuracy floor they must clear. Mis-triggering skill
descriptions is the known failure mode for skill libraries, and [[REQ-040]]'s
refuting outcome — skills invoked once and abandoned — is partly a triggering
problem.

## Specifiable work

[[WO-127]] (document listing and the dispatch queue) and [[WO-128]] (receipts as
data) now cover [[REQ-041]]'s first three gaps; both sit in `backlog`, so nothing
dispatches without the user's stamp. [[REQ-041]] item 5 — the `init` path over
MCP that [[DEC-125]] made necessary — has no work order yet.

## Formerly held pending the route

Three of [[REQ-041]]'s four gaps — document listing, queue introspection, and
structured receipts — are read-only, carry no promotion-boundary risk, and
depend on none of the open decisions above. They are dispatchable as work
orders whenever wanted; they are held here only to keep this route a planning
pass. The fourth gap, relay approval, is a frontier decision above.

## Not yet specified

- Authoring the fourteen skills' method documents — no longer blocked now that
  [[DEC-125]] has fixed their form and home; this is the largest remaining body
  of work and wants its own planning pass rather than a single work order.
- The onboarding skill's graph-centrality tour algorithm.
- The shell emitter itself — which harnesses get one beyond Claude Code, and
  whether shells are written per-project or once per user ([[DEC-125]] leaves
  this open deliberately).
- Whether method documents are a new `type:` or reuse an existing one — also
  left open by [[DEC-125]], and wants an answer before authoring starts.

## Out of scope

- **Rewriting [[WF-001]]** — the skills staff the loop; they do not redefine it.
- **An orchestration layer sequencing skills** — [[SRC-060]] principle 3 rules
  it out; the document graph is the handoff.
- **Surfacing skills inside the desktop app** — `packages/ui` is design-gated
  per [[DEC-012]], and is a separate effort from the library itself.

## Exposed by walking the route

Charting-level work has no equivalent of `veri start`'s claim. Two sessions read
this document and worked its first frontier item at the same time, producing
[[DEC-125]] and [[DEC-126]] independently; the conflict was caught by reading,
not by the machinery. Work orders cannot collide this way — an in-progress one
without a claim fails `veri check`, and a claim another session holds is refused
— but the deciding that happens *before* a work order exists is unprotected.
Worth its own decision if sessions are expected to run in parallel.
