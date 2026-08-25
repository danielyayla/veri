---
id: DEC-102
type: decision
title: "Claim staleness reuses the stale_after_days window, anchored on the newest of claim date and receipt dates"
status: active
approved: 2026-08-25
created: 2026-08-25
updated: 2026-08-25
links:
  - id: WO-099
    rel: constrains
  - id: WO-088
    rel: consistent-with
  - id: DEC-076
    rel: follows-from
  - id: DEC-025
    rel: consistent-with
---

## Choice

The stale-claim advisory fires when a claimed in-progress work order's newest sign of life — `claimed_at` or the newest receipt date in its `## Receipts` section — is at least the project staleness window old. The window is the existing `stale_after_days` knob on the workflow document ([[WO-088]]'s binding-drift window, core default 14 days): one knob, one meaning of "days of silence before in-progress work is suspect". The check is pure over documents plus a host-provided local `today` ([[DEC-076]]) — no git — so unlike binding staleness it runs on every surface, the subprocess-free MCP `run_check` included. Advisory tier by [[DEC-025]]: a crashed session's leftover claim informs, never blocks.

## Rejected alternatives

- **A separate `claim_stale_after_days` knob** — two thresholds answering the same question drift apart; a project that considers 7 days of code silence stale considers 7 days of claim silence stale too.
- **Anchoring staleness on git commit activity** — that is exactly [[WO-088]]'s binding-drift detector; the claim detector must run where git is unavailable (the MCP server spawns no subprocesses), and claims plus receipts are document facts.
- **Sub-day precision (timestamps in claims)** — day granularity is the repo-wide ruling ([[DEC-041]], [[DEC-076]]); agent sessions that finish within a day never look stale because staleness begins at the window, not at hour zero.
- **Violation instead of advisory** — a slow-but-live session (a maintainer's multi-day work, [[REQ-026]]) would fail every CI gate on day 14; staleness is a cleanup signal, not a correctness fact.

## Rationale

A receipt is the workflow's own definition of session activity (WF-001 rule 5), so the newest receipt date is the honest re-anchor: a long work order that keeps filing receipts never looks abandoned, while a claim with no receipts ages from the day it was taken. Reusing the WO-088 window keeps policy on the workflow document — the established home for project knobs (`design_gate_paths`, `maintainers`, `modules`) — and means one number tunes every staleness signal the project emits.
