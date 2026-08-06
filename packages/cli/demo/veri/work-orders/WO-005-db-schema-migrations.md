---
id: WO-005
type: work-order
title: DB schema + migrations
status: done
created: 2026-07-16
updated: 2026-07-19
links:
  - id: DEC-001
    rel: implements
  - id: REQ-001
    rel: supports
---

## Summary

Initial SQLite schema and the migration runner, per [[DEC-001]]. Supports
the local-state guarantee in [[REQ-001]].

## In scope

- Tables for invoices, line items, and clients
- Forward-only migration runner with a schema_version table

## Out of scope

- Backfill tooling for pre-release data files

## Requirements

Supports [[REQ-001]] (local state, restart-safe numbering).

## Acceptance tests

- [x] Fresh database migrates from empty to current schema
- [x] Migration runner refuses to run against a newer schema version

## Receipts

- 2026-07-19 — 4d0a9c2 — 6 files in src/db — initial schema and the
  forward-only migration runner
