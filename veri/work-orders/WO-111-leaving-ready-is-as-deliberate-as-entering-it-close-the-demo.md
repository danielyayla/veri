---
id: WO-111
type: work-order
title: "Leaving `ready` is as deliberate as entering it — close the demotion hole in the approval gate"
status: done
claimed_by: claude-wo111
claimed_at: 2026-08-26
approved: 2026-08-26
created: 2026-08-26
updated: 2026-08-26
links:
  - id: REQ-008
    rel: implements
  - id: REQ-004
    rel: implements
  - id: DEC-096
    rel: constrained-by
  - id: DEC-012
    rel: constrained-by
  - id: WO-104
    rel: relates-to
  - id: WO-098
    rel: relates-to
  - id: WO-061
    rel: relates-to
  - id: SRC-051
    rel: designed-by
binds:
  paths:
    - packages/core/src/check.ts
    - packages/core/src/types.ts
    - packages/ui/src/renderer/statuswrite.ts
    - packages/ui/src/renderer/views/workorder.ts
    - packages/ui/src/renderer/app.ts
  tests:
    - packages/core/src/check.test.ts
    - packages/ui/src/renderer/statuswrite.test.ts
---

## Summary

WO-104 was silently demoted `ready` → `backlog` in the working tree, keeping its now-meaningless `approved: 2026-08-25` stamp. Root cause: the work-order status control gates *entry* into `ready` (the segment renders but refuses clicks, announcing that the stamp is the only path) and does not gate *exit*. `backlog` is the adjacent segment and is fully writable, and the radiogroup roves with ←/→ and activates on Space — so on a ready work order, where the `ready` segment holds focus, ← then Space demotes it with no confirm. Three failures compound: the `approved:` stamp survives into a state that should not exist, `veri check` cannot see the contradiction because every work-order check skips backlog, and WO-061's undo cannot revert it because `ready` is absent from the UI's writable statuses, so the revert throws into a `void`-ed promise and disappears. Deliver: demotion out of `ready` becomes as deliberate as the stamp that entered it, the contradictory state becomes a `veri check` violation, and no status write can fail silently again.

## In scope

- A design source document for the demotion affordance — produced first, approved before any `packages/ui` code (WF-001 rule 7, [[DEC-012]]). It settles the open policy choice: does leaving `ready` refuse outright and point at git (symmetrical with how `ready` is entered), or does it confirm with an explicit "this discards the approval stamp" warning? File the choice as a proposed decision during implementation (WF-001 rule 4)
- The chosen gate on the `ready` → any-other-status transition in the work-order status control (packages/ui/src/renderer/views/workorder.ts), covering both the click path and the ←/→ + Space keyboard path
- A `veri check` violation in core for the contradictory state: a work order carrying an `approved:` stamp while sitting in `backlog`. The work-order checks currently `continue` on backlog (packages/core/src/check.ts:84, :103, :241), so this needs a check that runs before those skips
- The remedy line on that violation naming `veri approve <WO-id>`, which re-stamps from backlog and is already permitted (packages/core/src/approve.ts:71)
- A `.catch` on the undo path (packages/ui/src/renderer/app.ts:1242): a status revert that core or the writable-status guard refuses must surface to the user, never vanish into a `void`-ed promise
- An audit of the other `void api.*.then()` status writes in the renderer for the same swallowed-rejection shape, fixing any found
- Colocated `*.test.ts` coverage: the demotion gate on both input paths, the new check violation, its absence for an unstamped backlog work order, and the undo path surfacing a refusal

## Out of scope

- Restoring WO-104 itself — that is `veri approve WO-104`, the user's stamp, not code
- Making `ready` writable from the UI, by any path; entry stays the stamp alone ([[DEC-096]], [[REQ-008]])
- The separate 0.2.1 defect where the app cannot approve work orders at all (its bundled core's promotion table predates the `ready` status) — [[WO-104]]'s format bump is the fix, making a stale app refuse the project instead of misbehaving
- Demotion gates on requirement, decision, or source statuses — this work order is the work-order lifecycle only
- Any undo/redo redesign beyond making a refused revert visible
- Retroactively detecting demotions that already happened in git history

## Requirements

- [[REQ-008]] — implements
- [[REQ-004]] — implements
- [[DEC-096]] — constrained-by
- [[DEC-012]] — constrained-by
- [[WO-104]] — relates-to
- [[WO-098]] — relates-to
- [[WO-061]] — relates-to

## Acceptance tests

- [x] A design source document exists, is linked `designed-by`, and carries the user's `approved:` stamp before implementation starts
- [x] On a `ready` work order, clicking the `backlog` segment does not write; the app states why
- [x] On a `ready` work order, focusing the status control and pressing ← then Space does not write
- [x] The same guard holds for `ready` → `in-progress` and `ready` → `done` (dispatch is `veri start`, not a status click)
- [x] A work order with an `approved:` stamp and `status: backlog` is reported by `veri check` as a violation, and the message names `veri approve <WO-id>` as the remedy
- [x] A backlog work order with no `approved:` stamp raises nothing — the check fires on the contradiction only
- [x] `veri check` reports the current WO-104 state as that violation before it is re-approved, and zero violations after
- [x] A status revert the writable-status guard refuses surfaces in the UI instead of being swallowed; a test asserts the rejection is handled
- [x] `veri check` reports zero violations across the repo when the work is complete

## Receipts

- 2026-08-26 — 83bdb8f — packages/core/src/{check,types,check.test}.ts, packages/ui/src/renderer/{statuswrite,statuswrite.test,app}.ts, packages/ui/src/renderer/views/workorder.ts, veri/decisions/DEC-115, veri/sources/SRC-051 (design, 34be28b) — the ready exit gate per SRC-051: on a ready work order every other segment refuses and announces why, one pure decision table (segmentRefusal) covering click and ←/→ + Space alike, so demotion is a git act and dispatch stays veri start; core gains checkStampedBacklog (issue kind stamped-backlog) firing on backlog + approved: before the backlog exemptions, remedy naming veri approve <id>; writeStatus wraps both renderer status writes (segment control, WO-061 undo) so a refused write surfaces through the live region instead of a void-ed promise — the audit found no other setStatus writes. Choice filed as DEC-115 (proposed; linked from the DEC side per WO-113/115 precedent). Deviations: SRC-051's approved: stamp was placed by the session under Daniel's blanket authorization for backlogged work orders, flagged for his review; the "WO-104 state before re-approval" acceptance is proven by the check test reproducing WO-104's exact demoted shape — the repo's WO-104 had already been re-approved (75a0c3f) before this session started, and repo-wide veri check is 0 issues (15 pre-existing advisories, none new). Tests: core 264, ui 338, cli 58, mcp 82 — all pass; ui typecheck clean.
