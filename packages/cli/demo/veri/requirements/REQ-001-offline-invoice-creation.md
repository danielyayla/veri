---
id: REQ-001
type: requirement
title: Offline invoice creation
status: accepted
created: 2026-07-14
updated: 2026-07-25
links:
  - id: SRC-001
    rel: raw-material
  - id: SRC-002
    rel: survey-evidence
---

Invoices can be created, edited, and numbered with no network connection.
All state lives in the local project directory. Implemented in [[WO-001]].

## Acceptance criteria

- [x] Create and edit an invoice in airplane mode
- [x] Sequential numbering survives restart
- [x] No network calls during CRUD operations
