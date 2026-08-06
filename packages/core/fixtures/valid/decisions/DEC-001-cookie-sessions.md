---
id: DEC-001
type: decision
title: Cookie sessions over JWTs
status: active
created: 2026-08-01
updated: 2026-08-01
links:
  - id: REQ-001
    rel: constrains
---

## Choice

Server-side sessions in signed cookies.

## Rejected alternatives

- **JWTs** — revocation is painful (see [[DEC-002]] for the earlier attempt).

## Rationale

Simplest thing that supports instant revocation.
