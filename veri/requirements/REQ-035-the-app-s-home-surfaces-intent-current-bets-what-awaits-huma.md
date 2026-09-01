---
id: REQ-035
type: requirement
title: "The app's home surfaces intent: current bets, what awaits human judgment, what was recently learned"
status: accepted
kind: hypothesis
outcome:
  metric: median-time-to-judgment
  target: "< 48 hours"
approved: 2026-09-01
created: 2026-08-26
updated: 2026-09-01
links:
  - id: DEC-111
    rel: derived-from
  - id: SRC-050
    rel: derived-from
  - id: REQ-032
    rel: relates-to
  - id: REQ-033
    rel: relates-to
---

The most valuable view in an agent-built project is not the execution board — it is the intent view. Per DEC-111, the app's primary surface must answer the questions a product engineer actually holds: What are we betting on right now? What is waiting for my judgment? What did we recently learn?

The app presents a home view that aggregates, from existing documents and the existing check derivation (no new document types, no new storage):

- **Current bets** — hypothesis requirements (REQ-032) that are accepted and not withdrawn, each with its outcome metric/target and the state of its linked work orders; untested bets (the REQ-033 advisory: all work orders done, no outcome evidence) are visibly flagged as awaiting reality's answer.
- **Awaiting human judgment** — proposed decisions and draft requirements pending promotion, surfaced as the queue of gate crossings only a human can perform.
- **Recently learned** — the newest sources, with outcome sources (tests/supports/refutes links) called out and linked to the hypothesis they answer.

The view is derived and read-only in the sense that judgment actions link into the existing surfaces (approval queue, document reader); it introduces no authoritative state of its own. The execution board has since folded away entirely ([[DEC-145]]): Home is the conceptual center, and the Work Orders panel and detail carry the lifecycle.

## The bet

This requirement is a hypothesis, not a constraint: we believe that surfacing gate crossings on the home shortens the time documents wait for human judgment. The outcome metric is **median-time-to-judgment** — the elapsed time between a document being filed as `proposed`/`draft` and its promotion or rejection — with a target of under 48 hours. The metric is derivable from the corpus itself (filed dates against `approved:` stamps), so the outcome source that answers this bet can be computed from the knowledge base with no external telemetry.

## Acceptance criteria

- [ ] A home/intent view exists in the app showing current bets, awaiting-judgment, and recently-learned sections derived from documents and the check derivation.
- [ ] Hypothesis requirements show their outcome target and work-order state; untested bets are visibly flagged.
- [ ] Proposed decisions and draft requirements appear in the awaiting-judgment section and link to the surfaces where they are acted on.
- [ ] Outcome sources are distinguished from ordinary sources in the recently-learned section.
- [ ] The view holds no authoritative state; deleting it would lose nothing but rendering.
- [ ] `veri check` passes with zero issues.
