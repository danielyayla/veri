---
id: DEC-106
type: decision
title: "The dispatcher recipe is one copyable workflow file beside the check action — manual here, scheduled by adopters"
status: active
approved: 2026-08-25
created: 2026-08-25
updated: 2026-08-25
links:
  - id: WO-101
    rel: constrains
  - id: SRC-046
    rel: follows-from
  - id: DEC-069
    rel: builds-on
  - id: DEC-097
    rel: builds-on
  - id: DEC-101
    rel: builds-on
  - id: DEC-002
    rel: consistent-with
  - id: REQ-025
    rel: consistent-with
---

## Choice

The dispatcher ships as `.github/workflows/veri-dispatch.yml` — a single self-contained workflow file users copy, with its walkthrough on the docs site (`site/docs/dispatch.html`). The logic is inline shell around already-published surfaces: `veri next` polls ([[DEC-097]]), `veri start` claims ([[DEC-101]]), `veri context` briefs, and the existing Veri Check action ([[DEC-069]]) evaluates the gate before the PR opens. Idempotence needs no new state: an existing `veri/<id>` branch on the remote means the head was already dispatched and its PR is pending, so the poll exits silently.

This repository's own copy stays on `workflow_dispatch` with the `schedule` trigger commented — interactive sessions already consume this queue, and scheduled dispatch would spend the owner's agent tokens without an opt-in — and it runs the workspace build of the CLI, since the published 0.1.0 predates `veri next`/`veri start`. Adopters uncomment the schedule and install `@verikb/cli`; both divergences are single marked lines.

## Rejected alternatives

- **A second published action (`veri-dispatch@v1`)** — an action cannot own what dispatch needs: agent secrets, branch pushes, and PR creation are workflow-level concerns, and sealing the recipe would hide exactly the seam users must edit. A copyable workflow is honest about being a recipe.
- **A dispatch script inside the action bundle** — couples the zero-dependency check runner ([[DEC-069]]) to agent CLIs and `gh`; the gate must stay useful to repos that never dispatch.
- **Label-triggered dispatch** — labels live on issues and PRs, but `ready` is frontmatter state; the queue itself is the trigger source and a schedule is its natural poll. The label pattern belongs to issue-driven pipelines, not document-driven ones.
- **Live scheduled self-adoption in this repo** — races interactive sessions for the queue head and spends tokens nobody approved; the manual button keeps this repo on the same rung as its users' first step.
- **An `examples/` directory file** — a workflow that can actually run here is kept honest by its own repo; a dead example rots unnoticed.

## Rationale

Finding F4 of [[SRC-046]] asked for the lowest-trust dispatcher first: core stays offline per [[DEC-002]], and the consumer lives entirely at the edges, beside the check action, adopted the same way — one file ([[REQ-025]]'s one-snippet spirit). Everything the recipe does is composition of surfaces that already exist, so there is no second implementation of any queue, claim, or check semantics to drift.
