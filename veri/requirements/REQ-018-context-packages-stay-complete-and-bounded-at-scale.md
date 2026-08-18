---
id: REQ-018
type: requirement
title: Context packages stay complete and bounded at scale
status: draft
created: 2026-08-18
updated: 2026-08-18
links:
  - id: SRC-016
    rel: informed-by
  - id: REQ-003
    rel: extends
---

Today a context package is everything within an undirected 2-hop walk,
full bodies, no ranking, no budget — ~19.8k tokens for [[WO-028]] against
a 100-document corpus. Package size is an emergent property of graph
density: at the scale Veri intends to reach, hop-2 through any hub
document approaches the whole corpus verbatim, while everything at hop 3
is silently invisible. Both failure modes — unbounded size and silent
omission — get worse together ([[SRC-016]], scale simulation).

The package's virtues must survive the fix: it is deterministic,
reproducible, inspectable, and identical for human and agent. Those are
contract properties, and the contract is the moat.

## Acceptance criteria

- [ ] The binding set — workflow, the work order, and every document the
      approval gate reasons about — always arrives in full. No ranking or
      budget may ever truncate it.
- [ ] Package size is bounded: total tokens grow with the work order's
      direct neighborhood, not with corpus size or graph density.
- [ ] Nothing relevant is silently invisible: knowledge beyond the
      guaranteed set is enumerated for the agent (by id, title, and how it
      connects), and the agent has a tool path to retrieve any of it
      ([[REQ-017]]).
- [ ] Assembly stays deterministic: the same files produce byte-identical
      packages, including any size-based behavior switches.
- [ ] The UI package panel continues to show exactly what is served —
      including what is inlined versus enumerated.
- [ ] The reported token figures become enforced levers, not decoration.
