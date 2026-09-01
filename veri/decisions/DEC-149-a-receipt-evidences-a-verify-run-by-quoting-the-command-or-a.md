---
id: DEC-149
type: decision
title: "A receipt evidences a verify run by quoting the command or a verif- wordform"
status: active
approved: 2026-09-01
created: 2026-09-01
updated: 2026-09-01
links:
  - id: WO-145
    rel: constrains
  - id: REQ-042
    rel: satisfies
  - id: DEC-142
    rel: consistent-with
  - id: DEC-025
    rel: consistent-with
---

## Choice

The `verify-unevidenced` advisory ([[REQ-042]]) recognizes a receipt as
evidencing the declared verify run when the receipt's text contains the
declared command verbatim (trimmed) **or** a "verif-" wordform — verify,
verified, verification — at a word start, case-insensitive. "unverified"
never counts: the wordform must open a word, so a receipt confessing the
run was skipped keeps the advisory alive. Any receipt on the work order
may carry the evidence; the match reads the whole receipt item as
`parseReceipts` joins it, one line per DEC-142.

## Rejected alternatives

- **A structured receipt token** (e.g. a mandatory `verify: pass` /
  `verify: exit 0` segment) — recreates the receipt grammar [[DEC-142]]
  just retired: receipts are one-line prose pointers, and a second
  machine-parsed segment would rebuild the reconciliation tier one field
  at a time. It would also make every historical receipt style illegal
  overnight.
- **Command-verbatim only** — a natural sentence often paraphrases
  ("verified against staging", "verify run passed") without quoting the
  exact command string; refusing the wordform would nag honest receipts
  into boilerplate.
- **Wordform only** — the acceptance bar is "stays silent when a receipt
  quotes the run": a receipt that literally quotes `npm test exits 0`
  must count, and it contains no verif- word.
- **Executing the command to know** — forbidden outright: core, the MCP
  server, and the check derivation are subprocess-free ([[DEC-037]]);
  Veri states the bar and audits that it was met, it never becomes a
  test runner.

## Rationale

The advisory tier can afford a lenient textual heuristic ([[DEC-025]]):
a false silence costs one unflagged gap on a surface a human still
reads, while a strict grammar would cost the one-line pointer form
itself. Matching either the command or an honest wordform makes the
natural ways of writing "I ran it and it passed" all count, keeps the
one dishonest near-miss ("unverified") flagged, and leaves the receipt a
sentence rather than a record format. Revisit if receipts start gaming
the wordform (saying "verified" without running anything) — that is a
review-tier problem (WO-146's gate), not a grammar problem.
