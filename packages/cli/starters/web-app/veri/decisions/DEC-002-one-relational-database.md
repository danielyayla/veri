---
id: DEC-002
type: decision
title: One relational database as the system of record
status: proposed
created: 0001-01-01
updated: 0001-01-01
links:
  - id: REQ-003
    rel: satisfies
---

## Choice

All durable application state lives in a single relational database.
Caches and search indexes may exist, but they are derived — losing
them loses no data.

## Rejected alternatives

- **Document store as the primary database** — flexible early, but the
  app's core entities (users, sessions [[REQ-003]], and whatever the
  domain adds) are relational from the start, and migrations plus
  constraints are how a schema stays trustworthy as the team grows.
- **Polyglot persistence from day one** — one store per workload sounds
  principled, but every extra system of record multiplies backup,
  migration, and consistency work before the product has earned it.

## Rationale

One system of record means one backup story, one migration story, and
one place where an invariant can be enforced with a constraint instead
of a convention. Derived stores can be added later without ceremony
precisely because they are allowed to be lost. Swap the specific
database freely — the decision is the single-system-of-record posture,
not a product name.
