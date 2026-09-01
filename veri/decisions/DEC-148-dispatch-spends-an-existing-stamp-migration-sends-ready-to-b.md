---
id: DEC-148
type: decision
title: "Dispatch spends an existing stamp — migration sends ready to backlog and never re-dates a judgment"
status: proposed
created: 2026-09-01
updated: 2026-09-01
links:
  - id: WO-143
    rel: constrains
  - id: DEC-143
    rel: extends
  - id: REQ-008
    rel: constrained-by
  - id: REQ-015
    rel: constrained-by
---

## Choice

Two settlements [[DEC-143]] left open, chosen together because they are
one question — what becomes of an approval stamp that predates its
dispatch.

1. **The 4 → 5 migration rewrites `status: ready` to `status: backlog`**,
   one line per file, preserving `approved:`/`approved_by:` and every
   other byte: the migrated state is backlog-with-stamp — clearance
   granted but not yet spent.
2. **`dispatchWorkOrder` writes a fresh `approved:` date only when the
   document carries none.** An existing stamp is preserved, never
   re-dated — dispatch of a pre-stamped work order is a pure claim act
   that spends the judgment already on record.

Corollaries: the state the retired `stamped-backlog` check flagged is
legal and quiet; agent amendment (`amend_document`) refuses a stamped
backlog work order, because the stamp already covers its text
([[REQ-008]]); and work orders leave the `drift-approved-edited`
detector entirely, since their stamp is written and spent by the same
gesture.

## Rejected alternatives

- **Dispatch always re-stamps with the dispatch date** — the simplest
  reading of DEC-143's "writes the approval stamp and the claim". It
  loses because it rewrites history: dispatching a user-pre-approved
  work order would replace the user's recorded judgment date with a
  stamp the user never made that day — exactly the act [[REQ-008]]
  reserves to the user.
- **Migration strips the stamps (ready → plain backlog)** — the
  cleanest end state, with no transitional stamped-backlog shape. It
  loses because it discards clearance the user actually granted: every
  migrated work order would need a re-stamp at dispatch, turning a
  format migration into a mass revocation of decisions already made.
- **Migration sends ready → in-progress** — keeps the "cleared" meaning
  visible in the status. It loses because those work orders hold no
  claim: it would mint an `unclaimed-wo` violation per file and assert
  sessions hold work nobody holds.
- **Refuse to dispatch a pre-stamped work order (demand a hand edit
  first)** — maximally suspicious of the transitional state. It loses
  because it strands the migrated queue behind manual frontmatter
  surgery, and the state it distrusts is one the migration itself just
  wrote.

## Rationale

The stamp in the markdown is the record ([[DEC-002]], [[REQ-008]]):
re-dating stamps at dispatch time would falsify when the judgment was
made, and stripping them in migration would discard clearance the user
granted — forcing re-stamps the migration exists to avoid. Preserving
the stamp keeps the migration a format change rather than a promotion or
demotion, and keeps dispatch honest for both shapes: an unstamped
backlog work order gets the full one-gesture stamp-and-claim; a
pre-stamped one (the transitional migrated queue) gets its recorded
clearance spent. The dispatch gates — live-requirement trace, pending
links, the design gate, outstanding check issues — re-run at dispatch
either way, so a stale stamp never bypasses the prospective checks.
