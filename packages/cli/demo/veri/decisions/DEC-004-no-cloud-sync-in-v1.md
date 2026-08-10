---
id: DEC-004
type: decision
title: No cloud sync in v1
status: active
approved: 2026-07-28
created: 2026-07-28
updated: 2026-07-28
links:
  - id: REQ-003
    rel: locality-guarantee
---

## Choice

v1 is strictly local. Users who want sync point the project directory at
their own tool.

## Rejected alternatives

- **Built-in E2E sync** — doubles the surface area of the product.
- **Optional cloud backup** — still a server, still a privacy story to
  defend.

## Rationale

Sync doubles the surface area and undermines the pitch in [[REQ-003]].
Git or Syncthing on the project folder covers the real need.
