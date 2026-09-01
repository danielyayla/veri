---
id: DEC-142
type: decision
title: "Receipts are one-line pointers into git — the reconciliation tier retires"
status: active
approved: 2026-09-01
created: 2026-09-01
updated: 2026-09-01
links:
  - id: WO-141
    rel: constrains
  - id: REQ-021
    rel: amends
  - id: DEC-003
    rel: supersedes
  - id: DEC-040
    rel: informed-by
  - id: DEC-025
    rel: constrained-by
  - id: SRC-066
    rel: derived-from
---

## Choice

A receipt is one line under `## Receipts`: date — commit SHA or PR ref — one sentence of what the session did. Git is the record of what changed; the receipt is a pointer into that record, never a copy of it.

What carries forward from [[DEC-003]], which this supersedes: receipts stay per execution session, 0..n per work order, in the work order's own file, and `done` still requires at least one. What changes: the files-touched list leaves the format, and with it the reconciliation tier — `receipt-prefix`, `receipt-files`, and `receipt-unverified` retire with their fixtures, and `parseReceipts` stops harvesting path tokens. The check surface narrows to the one claim a pointer actually makes: `receipt-commit-missing` stays, because a pointer at a SHA absent from history is worth a flag.

Unaffected, by design: the reverse mapping (file → work orders) continues to derive from commit subjects (`WO-nnn:`), which never depended on receipt file lists; the drift detectors ([[DEC-041]]) are a different tier; [[DEC-040]]'s GitFacts plumbing survives to serve both. Existing receipts stay as filed — the parser stays lenient about old forms.

## Rejected alternatives

- **Keep the reconciliation tier (status quo).** Its best case: receipts are claims, unverified claims rot, and the three advisories are trust-but-verify machinery already built as pure core ([[DEC-040]]). It loses because the audit ([[SRC-066]]) found the tier verifying a copy against its original — the SHA, file list, and date all sit one `git show` away, and in practice the advisories fired on formatting drift of the copy, not on fraud. A lenient grammar, a parser, four rules, and a commit-subject convention existed to keep duplicated data honest with the history it duplicates: the dual bookkeeping the playbook warns against.
- **No receipts at all — git and the done flip are the whole record.** Its best case: maximal simplification; the playbook records execution as PR metadata and nothing else. It loses because the work order would no longer carry its own event log: [[DEC-003]]'s founding observation — a productive-but-incomplete session needs somewhere truthful to record itself — still holds, `get_receipts` and the app's display would go dark, and one line is cheap.
- **Machine-written receipts — the harness collects git facts and writes exact entries.** Its best case: accuracy through automation instead of reduction. It loses because the result is still a copy, now with tooling to keep it in sync; the MCP server is deliberately subprocess-free ([[DEC-037]], [[DEC-040]]) so the agent-facing door cannot collect the facts; and automating bookkeeping is the wrong direction when deleting the bookkeeping is available.

## Rationale

[[REQ-021]]'s own principle — derive, never book-keep — applied to receipts themselves ends by removing the parallel book, not by auditing it harder. What remains carries its weight: the pointer holds the one fact git cannot derive (which session, in one sentence, and where to look), `receipt-commit-missing` checks the only claim it makes, and the sacrifice is named — Veri no longer cross-examines a receipt's file list, because it no longer has one; `git show` answers that question from the original. This narrows REQ-021's first acceptance criterion, and amending that requirement is the user's act on the requirement itself; this decision records the why.

Revisit when: fabricated or rotted pointers appear in practice (`receipt-commit-missing` firing more than rarely), a host without reachable git history needs receipts to carry facts rather than point at them, or a done work order turns up with no traceable commit at all.
