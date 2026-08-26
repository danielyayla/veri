---
id: DEC-115
type: decision
title: "Leaving ready refuses in the UI, demotion is a git act, and the stranded stamp is an issue-tier check"
status: proposed
created: 2026-08-26
updated: 2026-08-26
links:
  - id: WO-111
    rel: derived-from
  - id: DEC-096
    rel: extends
  - id: SRC-051
    rel: informed-by
---

## Choice

Implementing [[WO-111]], the `ready` exit gate lands in three pieces:

1. **The UI refuses outright — no confirm, no new write path.** On a
   `ready` work order every other status segment becomes a non-writing
   target: it wears the existing gated treatment, its title carries the
   reason, and pressing it announces that reason through the live region.
   One pure decision table (`segmentRefusal` in
   packages/ui/src/renderer/statuswrite.ts) covers entry and exit for both
   input paths — the ←/→ + Space keyboard path is native button activation
   on the same handler a click reaches. Demotion out of `ready` is a git
   act (edit the file, commit the demotion), dispatch is `veri start`, and
   `ready` remains unwritable from the UI in either direction.
2. **The contradiction is an issue-tier check.** `checkStampedBacklog`
   (kind `stamped-backlog`) fires on a work order with `status: backlog`
   and an `approved:` stamp — a state no legitimate path produces, since
   ready exists only via the stamp ([[DEC-096]]). It runs unconditionally,
   before the backlog exemptions every other work-order check takes, and
   its remedy line names `veri approve <WO-id>` (re-stamping from backlog
   is already permitted) or removing the stamp lines in the demotion
   commit. Withdrawn work orders are out of play (DEC-110).
3. **One status write path, no swallowed rejections.** `writeStatus` wraps
   every renderer status write (the segment control and the WO-061 undo
   toast): success runs the follow-up, refusal — the writable-status
   guard, core validation, a race — surfaces the stripped error through
   the live region and clears the toast, never vanishing into a `void`-ed
   promise.

## Rejected alternatives

- **Confirm-with-warning ("this discards the approval stamp — demote
  anyway?")** — cannot be implemented honestly with the current write
  path: `setStatus` edits only the `status:` line, so a confirmed
  demotion would strand the stamp and manufacture the exact state the new
  check flags; honest confirm needs stamp-stripping write machinery for a
  rare act git already records better, and it breaks symmetry with entry,
  which refuses rather than confirms.
- **Making the UI strip the stamp on demotion** — a second
  approval-shaped ceremony that is not the stamp; discarding clearance is
  the same class as discarding a proposal, which [[REQ-008]] already
  ruled a git act, not a button.
- **Advisory tier for the stranded stamp** — the state is a
  contradiction, not a smell: `veri check` skipping it is precisely how
  WO-104's demotion went unseen, and a rule that cannot fail on a state
  that should not exist is the DEC-058 silent no-op.
- **Schema-tier (refusing to parse backlog + approved)** — would drop the
  document from the corpus and cascade broken-link issues everywhere it
  is referenced; the document must keep parsing while check names the gap
  (the DEC-112 posture).
- **Gating exit inside the keydown handler separately from click** — two
  gates drift; the arrow keys only rove focus (SRC-019) and activation is
  the button press, so one table on the press covers both paths by
  construction.

## Rationale

Entry and exit are the same door: `ready` means "the user cleared this
for dispatch", and both crossing directions must be the user's deliberate
act, not a stray Space. Refusing in the UI keeps the stamp's whole
lifecycle in git — entered by `veri approve`'s commit, left by an edit in
a commit — which is the audit trail REQ-008 already relies on. The check
closes the loop for demotions that happen anyway (hand edits, older
tools): the state becomes loud instead of silently skipped, with the
remedy in the message. Origin: implementing [[WO-111]]; design fixed by
[[SRC-051]].
