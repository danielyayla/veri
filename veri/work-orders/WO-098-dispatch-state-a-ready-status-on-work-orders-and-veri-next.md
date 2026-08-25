---
id: WO-098
type: work-order
title: "Dispatch state: a ready status on work orders and veri next"
status: done
created: 2026-08-25
updated: 2026-08-25
links:
  - id: SRC-046
    rel: derived-from
  - id: REQ-008
    rel: constrained-by
  - id: REQ-006
    rel: constrained-by
  - id: DEC-071
    rel: constrained-by
  - id: DEC-072
    rel: constrained-by
  - id: DEC-038
    rel: constrained-by
---

## Summary

A machine-readable "cleared for autonomous execution" state in the work-order lifecycle (backlog → ready → in-progress → done), entered only by the user's stamp and only when link gates pass, plus `veri next` — a deterministic, token-free command printing the next dispatchable work order. Finding F1 of [[SRC-046]]: readiness today is implicit (links approved plus unrecorded human intent), so no trigger can mechanically distinguish "specced, waiting" from "go." The ready stamp extends the approval semantics of [[REQ-008]] to dispatch, and `veri next` becomes the polling primitive every factory trigger builds on.

## In scope

- A `ready` status between backlog and in-progress in the work-order lifecycle, with schema, statuses, and `veri check` rules updated in the one rulebook ([[REQ-006]]).
- Entering `ready` is the user's act, following the approval-stamp mechanics of [[DEC-071]] and [[DEC-072]] (stamped, attributable, rides a commit) — decide during implementation whether `veri approve` gains a work-order arm or a sibling verb, and file the choice as a proposed decision.
- `veri check` refuses `ready` while any linked document is unapproved — the same gate that today refuses in-progress.
- `veri next`: print the next dispatchable work order (id, title, path), machine-readable output, deterministic ordering (file the ordering rule as a proposed decision); exits non-zero when nothing is ready.
- MCP parity per [[DEC-038]]: agents can see ready work orders through the existing read surface (extend search/get if needed, minimally).

## Out of scope

- Claim semantics (`claimed_by`/`claimed_at`) — the companion work order for finding F2.
- Any dispatcher, daemon, or CI recipe consuming `veri next` — finding F4's work order.
- Migration of existing backlog work orders (they simply never entered ready).
- Desktop-app surfacing of the ready queue (candidate follow-up).

## Requirements

- [[SRC-046]] — derived-from
- [[REQ-008]] — constrained-by
- [[REQ-006]] — constrained-by
- [[DEC-071]] — constrained-by
- [[DEC-072]] — constrained-by
- [[DEC-038]] — constrained-by

## Acceptance tests

- [x] A work order can move backlog → ready only via the user-stamp path, and `veri check` reports a violation if ready is reached with unapproved links or without the stamp.
- [x] `veri next` prints the single next ready work order deterministically and exits non-zero when none is ready.
- [x] The lifecycle change is enforced by schema: an unknown or out-of-order status transition is a check violation.
- [x] Non-trivial choices (stamp verb, ordering rule, output shape) are filed as proposed decisions with rejected alternatives.
- [x] `veri check` passes; tests colocated per repo convention.

## Receipts

- 2026-08-25 — 16345bd — packages/core/src/{schema,parse,approve,check,drift,next,index}.ts (+ tests, approve/broken fixtures), packages/cli/src/{cli,commands}.ts (+ tests), packages/mcp/src/search.ts, AGENTS.md, site/docs/reference.html — the ready status as the fourth stamped promotion (prospective link gate, missing-approval on unstamped ready, drift exemption past ready) and `veri next` over a pure core `nextDispatchable`; choices filed as [[DEC-096]] and [[DEC-097]]. Unknown statuses fail as invalid frontmatter; "only via the stamp" is the transition enforcement — there is no other write path into ready. All 325 workspace tests pass; `veri check` green (272 docs, 0 issues). Follow-up noted for the app: surface the ready state in the desktop UI (excluded here by scope).
