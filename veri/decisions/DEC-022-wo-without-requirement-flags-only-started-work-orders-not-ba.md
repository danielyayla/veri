---
id: DEC-022
type: decision
title: "wo-without-requirement flags only started work orders, not backlog"
status: proposed
created: 2026-08-12
updated: 2026-08-12
links:
  - id: WO-022
    rel: constrains
  - id: REQ-009
    rel: extends
  - id: REQ-008
    rel: follows-from
---

## Choice

checkWorkOrderRequirements skips work orders in `backlog`: the wo-without-requirement issue fires only once a WO is `in-progress` or `done`. A freshly created work order — from `veri new` or the desktop app's creation flow — therefore passes `veri check` untouched, which REQ-009 makes an acceptance criterion. The demo keeps teaching the issue: its WO-004 moves to `in-progress`, so the demo still reports exactly two deliberate issues.

## Rejected alternatives

- **Keep the check as-is and waive the acceptance criterion for work orders** — leaves every UI- or CLI-created WO born unhealthy, training users to ignore the health indicator; and it contradicts an approved requirement rather than an unapproved habit.
- **Scaffold new WOs with a placeholder requirement link** — trades one issue for a broken-link issue, or worse, silently links an arbitrary real requirement.
- **A separate "draft WO" status exempt from checks** — new status vocabulary and migration for something the existing backlog status already means.

## Rationale

REQ-008 already draws this exact line for the approval gate: "the gate is on starting work, not on planning" — backlog WOs may cite pending documents because planning is cheap and revisable. Requiring a requirement link is the same kind of gate; flagging a WO the moment it is scaffolded (before the user has typed anything) made the REQ-009 criterion "created documents pass check untouched" unsatisfiable for work orders and punished planning rather than unauthorized work.
