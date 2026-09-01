---
id: DEC-143
type: decision
title: "Approval and dispatch are one gesture — the ready state retires"
status: proposed
created: 2026-09-01
updated: 2026-09-01
links:
  - id: WO-143
    rel: constrains
  - id: REQ-039
    rel: amends
  - id: REQ-008
    rel: constrained-by
  - id: REQ-015
    rel: constrained-by
  - id: DEC-096
    rel: supersedes
  - id: DEC-097
    rel: supersedes
  - id: DEC-101
    rel: supersedes
  - id: DEC-106
    rel: supersedes
  - id: DEC-123
    rel: informed-by
  - id: SRC-066
    rel: derived-from
---

## Choice

The work-order lifecycle is backlog → in-progress → done. One transition, dispatch (`veri dispatch <WO-id> --as <session>`, and the app's equivalent control), writes the approval stamp (`approved:` / `approved_by:`) and the claim (`claimed_by` / `claimed_at`) in one line-targeted edit and one commit: the stamp and the claim are the same act, performed by the user.

Dispatch is human-only. The MCP server keeps no path into it — `start_work_order` retires with `ready`, because with no pre-approved-unclaimed state there is nothing left for an agent to start; an agent's move remains asking. Dispatch refuses prospectively everything `veri approve` refused ([[DEC-096]]'s invariant, re-anchored): no live-requirement trace, pending links, an unmet design gate, or an existing claim each block the gesture, so in-progress is born check-clean.

What carries forward from [[DEC-101]], unchanged: the claim fields travel together, a second dispatch is refused with the holder named, `unclaimed-wo` stays a violation, `shared-claim` keeps its chain exemption, and claims persist at `done` as provenance. What retires with the state: `stamped-backlog`, the ready-specific gate coverage, and the poll loop — `veri next` re-scopes from "head of the ready queue" ([[DEC-097]]) to "the backlog awaiting judgment", `get_queue` follows, and the copyable dispatcher recipe ([[DEC-106]]) goes with the queue it polled; the dispatch gesture itself is the trigger, and any future scheduled runner hangs off dispatch commits, not a queue scan. Removing an enum value is a knowledge-base format change: on-disk `ready` work orders need a real migration, so this ships behind a format bump ([[REQ-015]]), sequenced after WO-125's format 4.

## Rejected alternatives

- **Keep ready (status quo).** Its best case: judgment and execution stay decoupled — the user batch-stamps several work orders and sessions pull them asynchronously; the whole WO-098 loop (`veri next`, `veri start`, the dispatcher recipe) is built on that pull model, and a pull queue is how a fleet would scale. It loses because the record shows the decoupling unused: stamps land batch-applied minutes before starts (18-minute median from filing to stamp, stamp to claim tighter still, per [[SRC-066]]), so the extra state buys a fourth promotion, a queue surface, `stamped-backlog`, and workflow rule 8's ceremony without buying any separate act of judgment. An approval gate on the build path that adds a queue without adding judgment is the playbook's named anti-pattern.
- **Keep both doors — dispatch as sugar on top of ready.** Its best case: no format bump, no migration, and the pull model survives for adopters who want scheduled dispatch. It loses because two doors into in-progress means two lifecycles to check, render, document, and teach; the audit's core finding is that a state kept "in case" rots into ceremony, and keeping ready keeps everything this fork exists to delete. A half-taken fork costs both branches.
- **The playbook-native extreme — no recorded approval; the merge is the stamp.** Its best case: zero ceremony, approval lives in PR metadata where the playbook puts it. It loses [[REQ-008]] outright: Veri's product is the record of intent judgment, "who cleared this and when" is that record's content rather than its overhead, and merging code is a different act from deciding to build.

## Rationale

The stamp survives; it relocates to the moment it is actually exercised. [[REQ-008]]'s substance was never the ready state — it is that no agent can clear work for execution. Dispatch keeps that boundary intact inside one human gesture and deletes the state whose entire observed life was the gap between the two halves of that gesture. Fewer states, the same authority, and the queue Veri shows the user becomes a queue of judgment (what awaits a decision) instead of a queue of ceremony (what awaits a keystroke). The sacrifice is named: asynchronous pull-based dispatch is gone until something earns it back.

The trace check ([[REQ-039]], [[DEC-123]]) survives re-anchored: its mechanism is untouched and it binds at dispatch and in-progress instead of at ready-admission. Amending REQ-039's wording is the user's act on the requirement; this decision records the why.

Revisit when: a real pull-based fleet emerges — the user stamping clearances faster than sessions consume them, which is the one workload where the queue earns its state back — or the record shows dispatch-without-reading (judgment eroding into reflex), which argues for re-separating the stamp from the start.
