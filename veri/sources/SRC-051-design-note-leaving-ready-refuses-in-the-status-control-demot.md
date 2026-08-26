---
id: SRC-051
type: source
title: "Design note — leaving ready refuses in the status control; demotion is a git act"
status: imported
approved: 2026-08-26
created: 2026-08-26
updated: 2026-08-26
links:
  - id: REQ-004
    rel: designs
  - id: DEC-012
    rel: constrained-by
  - id: DEC-096
    rel: builds-on
  - id: SRC-019
    rel: builds-on
---

> Drafted 2026-08-26 by an agent session (Claude Code) implementing
> [[WO-111]], under Daniel's blanket authorization to implement all
> backlogged work orders (the same authorization cited by the batch
> approval precedent). Stamped `approved:` on that authorization; the
> stamp is Daniel's to revoke if the design should have waited.

## The question

WO-104 was silently demoted `ready` → `backlog` by a stray interaction
with the work-order status control: the control gates *entry* into
`ready` (the segment renders but refuses clicks) and not *exit*, so on
a ready work order — where the `ready` segment holds focus — ← then
Space wrote `backlog` with no confirmation, stranding the `approved:`
stamp in a state that should not exist.

[[WO-111]] leaves the policy open: does leaving `ready` **refuse
outright** and point at git (symmetrical with how `ready` is entered),
or **confirm** with an explicit "this discards the approval stamp"
warning?

## The choice: refuse outright

On a `ready` work order, every other segment of the status radiogroup
becomes a non-writing target, exactly like the `ready` segment on a
non-ready work order today. A press announces why (the app's existing
polite live region) and writes nothing. The same handler serves the
click path and the ←/→ + Space keyboard path — the radiogroup's
keyboard activation lands on the same button press.

Three reasons, in order of weight:

1. **Symmetry with entry.** `ready` exists only via the stamp
   ([[DEC-096]]): the control already announces "the stamp is the only
   path" on the way in. Discarding a dispatch clearance is the same
   class of act as discarding a proposal, and [[REQ-008]] already
   ruled that discarding is a git act, not a button. The gate on the
   way out should read like the gate on the way in.
2. **A confirm cannot be implemented honestly with the current write
   path.** The UI's `setStatus` edits only the `status:` line — a
   confirmed demotion would leave `approved:` behind, manufacturing
   the exact contradictory state WO-111's new check flags. An honest
   confirm needs new stamp-stripping write machinery for an act that
   is rare, deliberate, and better recorded as a git edit.
3. **It closes the undo hole instead of patching around it.** WO-061's
   undo reverts through the same writable-status path, and `ready` is
   not writable — so a demotion out of `ready` was also unrecoverable
   in the UI. With no write out of `ready`, no undo toast can ever
   need to write `ready` back.

## The rendering

- On a `ready` work order, `backlog`, `in progress`, and `done` render
  with the existing `seg-item-gated` treatment (dimmed, `not-allowed`
  cursor) that the `ready` segment already wears on other work orders.
  One grammar for "shown, not clickable" — no new visual vocabulary.
- Each gated segment's `title` carries its refusal, and pressing it
  announces the same text:
  - → `backlog`: "leaving ready discards the approval stamp — a
    deliberate demotion is a file edit committed in git, not a click"
  - → `in progress`: "a ready work order is started with veri start
    &lt;id&gt; — the claim records who holds it, a click would not"
  - → `done`: "a ready work order reaches done through veri start and
    a receipt — dispatch is veri start, not a status click"
- Keyboard behavior is unchanged: ←/→ still rove focus across all four
  segments (a gated segment is perceivable, focusable, and explains
  itself — SRC-019's radiogroup contract), and ↩/Space on a gated
  segment triggers the announcement instead of a write.

## Rejected: confirm-with-warning

A dialog ("this discards the approval stamp — demote anyway?") keeps
the action in the UI at the cost of new write machinery (stamp
stripping), a second approval-shaped ceremony that is not the stamp,
and an asymmetry with entry, which refuses rather than confirms. If
demotion-from-the-app is ever wanted, it should arrive as a designed
"withdraw clearance" act that removes the stamp in the same edit —
its own work order, not this fix.

## Failed writes surface

Independent of the gate: any status write the sidecar refuses (the
writable-status guard, core validation, a race with an external edit)
surfaces through the live region as "status not written — reason" /
"undo refused — reason", never a silently dropped promise. The toast
clears; the document view still shows disk truth after refresh.
