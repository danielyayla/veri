---
id: WO-141
type: work-order
title: "Receipts become pointers — the provenance reconciliation tier retires"
status: in-progress
claimed_by: fable-wo141
claimed_at: 2026-09-01
approved: 2026-09-01
created: 2026-09-01
updated: 2026-09-01
links:
  - id: REQ-021
    rel: amends
  - id: DEC-142
    rel: constrained-by
  - id: SRC-066
    rel: derived-from
# binds:         # code this work order claims (optional)
#   paths: []    # repo-root-relative globs
#   tests: []    # test files proving it (path or path::name)
---

## Summary

SRC-066's audit found receipts duplicating what git already holds (SHA, files, date) in a lenient grammar that needed a parser, four reconciliation advisories, and commit-subject conventions to stay honest with the history it duplicates — the dual bookkeeping the playbook warns against. A receipt becomes a one-line pointer: date, commit or PR ref, one sentence. Git is the record; the receipt links into it. BLOCKER: this narrows accepted intent (REQ-021's reconciliation breadth), so a proposed decision via veri:decide needs Daniel's stamp before this can be approved.

## In scope

- Retire the receipt-prefix, receipt-files, and receipt-unverified advisory rules and their fixtures
- Keep receipt-commit-missing (a pointer at a SHA absent from history is still worth a flag)
- Remove path-token harvesting from parseReceipts and everything that consumed it
- Rewrite the receipt guidance in the default workflow text and work-order template to the one-line pointer form
- Update the get_receipts rendering to match

## Out of scope

- Rewriting existing receipts (history stays as filed; the parser stays lenient about old forms)
- The ## Receipts section itself (receipts remain the work order's event log)
- The drift-approved-edited and drift-edited-after-done detectors (a different tier, untouched)
- The done-flip mechanics

## Requirements

- [[REQ-021]] — amends
- [[DEC-003]] — constrained-by
- [[SRC-066]] — derived-from

## Acceptance tests

- [ ] veri check emits none of the three retired advisories on a fixture corpus that previously triggered all three
- [ ] receipt-commit-missing still fires on a receipt citing a SHA absent from history
- [ ] parseReceipts no longer returns path tokens, and no caller expects them
- [ ] The default workflow text and work-order template describe the pointer form: date — commit/PR ref — one sentence
- [ ] Full suite green, veri check zero issues on this repo

## Receipts

(none yet)
