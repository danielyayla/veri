---
id: WO-001
type: work-order
title: Invoice CRUD
status: done
created: 2026-07-17
updated: 2026-07-28
links:
  - id: REQ-001
    rel: implements
  - id: DEC-001
    rel: storage
---

## Summary

Create, edit, duplicate, and void invoices against the SQLite store from
[[DEC-001]]. Delivers the core loop of [[REQ-001]].

## In scope

- Invoice create/edit/duplicate/void against the local SQLite file
- Sequential invoice numbering with restart-safe allocation
- Line items with quantity, rate, and per-line notes

## Out of scope

- PDF export ([[WO-002]])
- Client management beyond picking an existing client

## Requirements

All acceptance criteria of [[REQ-001]] verbatim (see that file).

## Acceptance tests

- [x] CRUD round-trip works with networking disabled
- [x] Numbering continues correctly after an app restart mid-sequence
- [x] Voided invoices keep their number; the sequence never reuses it

## Receipts

- 2026-07-28 — b21e88f — 14 files across src/invoice and tests — invoice
  CRUD against the SQLite store, restart-safe numbering
