---
id: DEC-001
type: decision
title: Zero runtime dependencies as the default posture
status: proposed
created: 0001-01-01
updated: 0001-01-01
links:
  - id: REQ-003
    rel: satisfies
---

## Choice

The library starts with zero runtime dependencies, and the burden of
proof sits on adding one — a dependency enters only through a decision
document that names what was tried instead ([[REQ-003]]).

## Rejected alternatives

- **Take dependencies freely, prune later** — pruning later never
  happens; each dependency grows roots (types in the public surface,
  behavior consumers observe) and removal becomes a breaking change
  ([[REQ-002]]).
- **A blanket ban with no exception path** — dogma over judgment.
  Some problems (parsers, cryptography) are genuinely better solved by
  a well-maintained dependency; the decision-document gate keeps the
  door open and the reasoning on record.

## Rationale

For a library, dependencies are not an implementation detail — they
are transitively imposed on every consumer. Starting from zero makes
each addition a visible, reviewable event with a written alternative
analysis, which is exactly the weight the choice deserves.
