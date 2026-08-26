---
id: SRC-050
type: source
title: "Design note: the product-engineering pivot — Veri as the system of record for product intent"
status: imported
created: 2026-08-26
updated: 2026-08-26
---

## Origin

Conversation with Daniel, 2026-08-26. Daniel endorsed a direction essay ("I love this and I want to move Veri in this direction") repositioning Veri from "help the AI write code better" to "AI-native product-engineering operating system" — optimizing for the part that stays scarce when agents solve implementation: human judgment about what to build, why, for whom, under what constraints, and whether the result actually worked.

## The thesis

> Agents can build anything. Veri helps humans decide what should be built.

Veri is the system of record for product intent in an agent-built software world. The lifecycle it models is:

```
evidence → understanding → product intent → requirements → decisions
→ bounded work → agent implementation → verification → learning → revised intent
```

The human stays concentrated on the left side (interpreting evidence, choosing tradeoffs, defining acceptable outcomes, judging whether implementation solved the problem). Agents absorb the right side (exploration, planning, coding, tests, mechanical verification). Humans sit at semantic boundaries, not at every action: **humans define and revise intent; agents execute within intent.** This matches the approval model already in place (agents file `draft`/`proposed`; only Daniel promotes).

## Layer framing

- WHY — vision, users, outcomes, evidence (sources)
- WHAT — requirements, decisions
- HOW — work orders, agent implementation
- DID IT WORK? — receipts, tests, user feedback, new evidence

Most tools compete at HOW. If coding is cheap, Veri competes at WHY, WHAT, and DID IT WORK?

## Concrete ideas the essay proposes (with assessment)

1. **`kind: constraint | hypothesis` on requirements.** "The app must not lose data" (satisfy) and "showing the map during onboarding improves activation" (test) should not carry equal epistemic certainty. Hypothesis REQs carry an outcome target (metric + threshold). Assessed as the highest-leverage, lowest-cost idea: one frontmatter field, no new document type, changes what verification means per kind. → filed as a draft REQ.

2. **Outcomes re-enter as sources.** implemented ≠ validated ≠ successful. But outcome claims written as receipt prose are unverifiable by `veri check` and rot. The structural fix: an outcome is evidence, so it enters as a new SRC linked back to the hypothesis REQ and the WO. The learning loop (evidence → intent → work → new evidence) closes through the existing type system, with no new receipt category. → filed as a draft REQ.

3. **Extended WO lifecycle (implemented → validating → validated → done).** Deferred: let `kind: hypothesis` + outcome sources carry the concept first; add statuses only if the lightweight version proves insufficient. Status changes ripple through core, CLI, and the UI (cf. the `ready` rollout) and cost a migration.

4. **`product/` directory (vision, principles, users, outcomes, current-bets).** Plausible but not adopted here; whether orientation documents get a namespace or live as approved SRC/DEC documents is a separate decision.

5. **`memory/current-focus.md`, `project-state.md`.** Rejected: derived views hand-maintained as prose become a second, drifting authority. Current focus is a query over WO frontmatter; the UI/CLI should render it.

6. **UI center of gravity moves from the execution board to an intent home** ("What are we trying to achieve? What evidence changed? What decisions are unresolved? What awaits human judgment? What did we recently learn?"). The key notification shifts from "agent finished WO-113" to "WO-113 passes all automated checks; human judgment needed on whether it solves REQ-031." Noted as future UI direction, not actioned here.

## Feature filter this thesis yields

Does it improve the quality of human judgment, preserve intent, steer agents, or close the learning loop? If not, Veri probably shouldn't own it.
