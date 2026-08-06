---
id: DEC-001
type: decision
title: SQLite over flat files
status: active
created: 2026-07-15
updated: 2026-07-15
links:
  - id: WO-005
    rel: schema-work
---

## Choice

Store invoices and clients in a single SQLite file inside the project
directory.

## Rejected alternatives

- **JSON file per record** — no transactions, and search means scanning
  every file.
- **Markdown tables** — human-friendly but unqueryable at any volume.

## Rationale

One SQLite file gives us transactions, fast search, and a single artifact
to back up. Schema and migrations in [[WO-005]].
