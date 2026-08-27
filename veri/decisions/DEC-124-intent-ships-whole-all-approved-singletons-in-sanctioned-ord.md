---
id: DEC-124
type: decision
title: "Intent ships whole: all approved singletons in sanctioned order, the bet as a hop-1 pointer, drafts invisible"
status: active
approved: 2026-08-27
created: 2026-08-27
updated: 2026-08-27
links:
  - id: WO-124
    rel: decided-during
  - id: REQ-039
    rel: implements
  - id: DEC-121
    rel: builds-on
  - id: DEC-035
    rel: builds-on
---

## Choice

Implementing [[REQ-039]]'s intent-led assembly ([[WO-124]]):

1. **Every accepted product singleton ships in full**, not excerpted. The layer is small by design (REQ-037's closed set, four short documents); excerpting would cut exactly the material the layer exists to deliver. REQ-039's "or the relevant excerpts" clause stays available as a future knob if the singletons ever bloat.
2. **The intent section opens the package** — before the workflow, which keeps its DEC-018 place: intent precedes process precedes specifics. Singletons render in the sanctioned reading order (vision, users, principles, current-focus), by `PRODUCT_FILES` index.
3. **The bet is a hop-1 derivation**: every *accepted* `kind: hypothesis` requirement the work order links directly (either direction) gets a pointer block in the intent section — metric and target via `outcomeLabel`, plus the framing sentence that shipping does not settle it. The requirement's full body still ships in the Requirements section; the bet block adds the frame, not the spec.
4. **Drafts are invisible in packages** — not labeled, not named. Pending REQ/DEC documents ship in a labeled proposals block because agents must not contradict them; a draft product singleton is different: un-ratified *intent* must not steer at all, half-visible intent steers half.
5. **Product documents leave the traversal buckets** (the workflow exclusion, one type over): include-always types render in their own section, and a linked singleton must not also appear as a context-map row.

## Rejected alternatives

- **Vision + current-focus only, users/principles excerpted** — a token optimization for a layer whose whole point is a ~1–2k-token product model; partial intent invites an agent to fill the gaps with guesses.
- **Labeling draft singletons like pending REQ/DECs** — "visible but non-binding" is right for spec agents must not contradict, wrong for intent agents must not follow; invisible is the honest state.
- **Deriving bets from the transitive requirement chain** — hop-2 hypotheses reached through other documents are context, not this work order's bet; direct linkage is the claim of what the work tests.
- **Stating the bet only in the requirement's own section** — the metric already ships there (Outcome line), but buried below the workflow it reads as spec detail; the intent section is where the agent forms its frame.

## Rationale

The package is where the WHY/WHAT/HOW layering becomes real for agents ([[DEC-111]]): an agent that reads the vision, the current focus, and the bet before the rules and the spec can push back when an implementation would satisfy the acceptance criteria without moving the metric. On this repository the section stays empty until the seeded singletons are approved — only ratified intent steers, which is itself the feature. Origin: [[SRC-056]].
