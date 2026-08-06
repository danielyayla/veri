---
id: WO-001
type: work-order
title: Build login flow
status: done
created: 2026-08-01
updated: 2026-08-03
links:
  - id: REQ-001
    rel: delivers
  - id: DEC-001
    rel: constrained-by
---

## Summary

Implement sign-in and sign-out per [[REQ-001]].

## Acceptance tests

- [x] Bad credentials rejected with a clear error
- [x] Session cookie set on success

## Receipts

- 2026-08-03 — abc1234 — src/login.ts, src/session.ts — built login flow with cookie sessions
