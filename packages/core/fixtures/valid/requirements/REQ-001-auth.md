---
id: REQ-001
type: requirement
title: User authentication
status: accepted
approved: 2026-08-02
created: 2026-08-01
updated: 2026-08-02
links:
  - id: DEC-001
    rel: constrained-by
owner: daniel
---

Users must be able to sign in and out. Session handling follows [[DEC-001]].

## Acceptance criteria

- [ ] Sign-in form rejects bad credentials
- [ ] Session expires after 30 days
