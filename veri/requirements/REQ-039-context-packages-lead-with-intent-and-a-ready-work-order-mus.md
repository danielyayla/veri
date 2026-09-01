---
id: REQ-039
type: requirement
title: "Context packages lead with intent, and dispatched work must trace to a live requirement"
status: accepted
approved: 2026-09-01
created: 2026-08-27
updated: 2026-09-01
links:
  - id: SRC-056
    rel: derived-from
  - id: DEC-111
    rel: builds-on
  - id: DEC-018
    rel: builds-on
  - id: DEC-143
    rel: constrained-by
  - id: REQ-037
    rel: depends-on
---

The WHY/WHAT/HOW layering ([[SRC-056]], [[DEC-111]]) becomes real where agents actually read: the context package.

1. **Intent-led assembly.** `get_context` / `veri context` opens with the intent layer before the requirement/decision section: the approved product singletons (or the relevant excerpts — at minimum vision and current focus, per REQ-037) and, when the work order implements a `kind: hypothesis` requirement, the bet itself — the metric and target that would confirm or refute it. An agent that knows the hypothesis can push back when an implementation would satisfy the acceptance criteria without moving the metric. Workflow rules ([[DEC-018]]) still arrive; intent precedes process precedes specifics.

2. **The worth-making trace.** A work order is dispatchable only if it traces — directly or transitively through its links — to a live (non-withdrawn, non-retired) requirement: the dispatch gesture ([[DEC-143]]) refuses it otherwise, and an in-progress work order with no such trace is orphan execution and fails `veri check`. This enforces the redefinition of a work order as *the smallest bounded product change we are currently confident is worth making*, rather than a ticket naming files to modify. Backlog work orders are exempt: sketching is free; dispatch is the gate.

Together with the untested-bet advisory ([[REQ-033]]) and the intuition-only advisory (REQ-038), every unit of execution is answerable to intent on the way in and to reality on the way out.

## Acceptance criteria

- [ ] The context package opens with an intent section: approved product singletons (or excerpts) ahead of requirements and decisions
- [ ] For a work order implementing a hypothesis requirement, the package states the bet: metric and target
- [ ] Dispatch refuses a work order with no direct or transitive link to a live requirement, and an `in-progress` one with no such trace fails `veri check`
- [ ] `backlog` work orders are exempt from the trace check
