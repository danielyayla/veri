---
id: REQ-021
type: requirement
title: Provenance and drift are mechanical, not social
status: draft
created: 2026-08-18
updated: 2026-08-18
links:
  - id: SRC-016
    rel: informed-by
  - id: DEC-003
    rel: follows-from
  - id: DEC-025
    rel: constrained-by
---

The gate produces stamps and receipts, but nothing checks them: a
receipt cites a commit SHA no machine verifies, and a stamp keeps
asserting approval long after the file under it has changed. Trust in
the corpus currently rests on authoring discipline — the critique's
finding that "provenance, drift, and propagation are social, not
mechanical" ([[SRC-016]]). This requirement makes the machine carry
that weight.

Two obligations, one principle. Receipts must be verifiable: what a
receipt claims about git — the commit exists, follows the `WO-nnn:`
convention, touched the files named — is checked, and the same
convention read in reverse answers "why does this file exist?" with a
work order. Drift must be surfaced: when the knowledge base moves out
from under its own stamps (a requirement edited after its implementing
work order closed, active work citing superseded authority, an
approved document that no longer says what was approved), Veri notices
and says so.

Everything here is derived from files plus git history on demand —
never book-kept in parallel — and everything reports through the
advisory tier ([[DEC-025]]): drift and broken provenance inform;
they never block.

## Acceptance criteria

- [ ] Every receipt's git claims are machine-checked: a missing commit,
      a commit without the `WO-nnn:` prefix, a file list disjoint from
      the commit's changes, or a `done` work order with no verifiable
      receipt each surface as an advisory naming the work order.
- [ ] The reverse mapping is derivable on demand: for any file, the
      work orders whose commits touched it; for any work order, the
      commits that realized it — with no stored index.
- [ ] A requirement or decision edited after the close of a work order
      implementing it surfaces as a drift advisory.
- [ ] An active work order linking a superseded decision surfaces as a
      drift advisory; a done one does not.
- [ ] An approved document whose body changed after its `approved:`
      stamp surfaces as a drift advisory, excluding the approve flow's
      own guarded-line writes.
- [ ] All findings flow through the existing advisory pipeline (CLI,
      UI, context packages) and never affect `veri check`'s exit
      status ([[DEC-025]]).
- [ ] Outside a git repository, every check degrades to a skip with a
      note — never a failure.
