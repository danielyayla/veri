---
id: DEC-123
type: decision
title: "The worth-making trace follows outbound links breadth-first; the no-link case stays with wo-without-requirement"
status: proposed
created: 2026-08-27
updated: 2026-08-27
links:
  - id: WO-123
    rel: decided-during
  - id: REQ-039
    rel: implements
---

## Choice

Implementing [[REQ-039]]'s trace check ([[WO-123]]):

1. **Traversal is breadth-first over outbound frontmatter links**, from the work order through any intermediate document, cycle-safe via a visited set. Inline `[[refs]]` do not carry the trace — the declared link graph is the accountable one.
2. **Live means a requirement that is neither withdrawn nor retired.** Draft counts as live here: pending targets are the gated-wo check's business, and double-flagging one state teaches people to ignore issues.
3. **Withdrawn documents neither satisfy nor extend the trace; a retired requirement's links still carry it** — a retirement often names its successor, and reaching the live successor is a legitimate trace.
4. **The no-link case stays with `wo-without-requirement`.** `orphan-wo` fires only when a requirement link exists but everything reachable has left play — one root cause, one issue.
5. **`ready` and `in-progress` are checked; `backlog` and `done` are exempt.** Sketching is free and history is never re-judged when a requirement later retires.
6. **`veri approve` refuses prospectively**: dispatch clearance over only dead requirements would fail the orphan check the moment the stamp landed, so ready stays born check-clean (the WO-098 posture).

## Rejected alternatives

- **Following links in both directions** — inbound links would let anything that merely mentions a work order legitimize it; worth-making is a claim the work order's own graph must make.
- **Counting inline refs** — prose mentions are commentary, not declarations; the design gate learned the same lesson (DEC-114).
- **Flagging done work orders whose requirements later retired** — retroactive orphaning would punish correct history and invite editing receipts to silence checks.
- **Depth-limiting the traversal** — an arbitrary hop count would make legitimate deep chains fail unpredictably; the visited set already bounds the walk by corpus size.
- **Also firing orphan-wo on link-less work orders** — two issues for one root cause; the older check owns that case.

## Rationale

The trace is the mechanical half of "the smallest bounded product change we are currently confident is worth making": confidence must be traceable to something still in play. Scoping to ready/in-progress puts the gate exactly where dispatch happens, and the audit that shipped with the check found zero existing work orders failing it, so it lands blocking with no migration debt. Origin: [[SRC-056]].
