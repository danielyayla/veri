---
id: DEC-003
type: decision
title: Receipts are per execution session, 0..n per work order
status: superseded
superseded_by: DEC-142
approved: 2026-08-10
created: 2026-08-06
updated: 2026-09-01
links:
  - id: REQ-003
    rel: constrains
  - id: WO-003
    rel: constrains
---

## Choice

A receipt records one agent (or human) work session on a work order: date,
commit SHA, files touched, one-line summary. A work order accumulates any
number of receipts under a `## Receipts` section in its own file. A work
order is `done` only when all acceptance criteria are checked and at least
one receipt exists.

## Rejected alternatives

- **Single receipt on completion** — the original spec. Loses the history
  of multi-session work orders and gives the agent nothing to file after a
  productive-but-incomplete session. The design mockup surfaced this
  contradiction: an in-progress work order with real work done had nowhere
  truthful to record it.
- **Separate receipt files (RCP-xxx)** — cleaner data model, but doubles
  file count and splits the work order's story across files. Receipts have
  no independent life; they belong to their work order.

## Rationale

Sessions are the natural unit of agent work. Receipts-in-file keeps the
whole narrative of a work order — spec, criteria, execution history — in
one document a human can read top to bottom.
