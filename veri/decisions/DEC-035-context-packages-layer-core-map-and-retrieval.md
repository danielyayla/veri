---
id: DEC-035
type: decision
title: "Context packages layer core, map, and retrieval"
status: proposed
created: 2026-08-18
updated: 2026-08-18
links:
  - id: DEC-006
    rel: follows-from
  - id: REQ-018
    rel: satisfies
  - id: SRC-016
    rel: informed-by
---

## Choice

Restructure `assembleContext` output into three layers, replacing the
uniform full-body 2-hop dump of [[DEC-006]]:

1. **Core — guaranteed, full text.** The workflow document, the work
   order, and every *directly linked* document (frontmatter links and
   inline mentions at hop 1), packed per the existing assembly policy.
   This is the binding set the approval gate reasons about; it is never
   ranked, truncated, or budgeted.
2. **Context map — guaranteed, index only.** The hop-2 ring rendered as
   annotated rows instead of full bodies: id, title, type, status, the
   rel-path that connects it to the work order, and its token size. The
   map tells the agent what exists, why it is adjacent, and what
   retrieval costs.
3. **Retrieval — on demand.** The agent dereferences map rows (or search
   hits) via the read tools required by [[REQ-017]].

**Escalation rule:** if the fully-inlined package (core + hop-2 bodies)
would fit under an inline threshold (initially ~15k tokens, a named
constant in the assembly policy), inline everything — today's behavior.
The switch is a pure function of the same files, so assembly remains
deterministic and the package panel can show exactly which mode was used
and what was inlined versus mapped.

## Rejected alternatives

- **Status quo (unbounded full 2-hop)** — package size is an emergent
  property of graph density; at corpus scale it approaches the whole
  knowledge base verbatim while hop-3 knowledge stays silently invisible.
- **Pure retrieval, no package** — abandons the deterministic, inspectable
  contract that is Veri's trust story; an agent that never retrieves would
  start with nothing binding.
- **Ranked truncation under a token budget** — keeps one big package but
  makes inclusion a relevance heuristic; a wrong ranking silently drops
  binding context, which is worse than visibly mapping it.
- **Embedding/semantic index** — reintroduces a derived store with sync
  and opacity costs ([[DEC-002]]) to solve what link structure already
  encodes; may return someday as an additive aid, not as the mechanism.

## Rationale

The package's contract properties — deterministic, reproducible,
inspectable, identical for human and agent — are the moat and must
survive scale. Layering preserves them exactly where they bind (core,
map, and the escalation switch are all deterministic) while converting
the unbounded part of the old design into an explicit, cheap index.
Completeness *improves*: today anything past hop 2 is invisible; a map
plus retrieval names the adjacent unknowns and makes the rest reachable.
The cost — reliance on agent retrieval competence — degrades gracefully,
because an agent that never retrieves still holds everything binding.
Small projects notice nothing: the escalation rule keeps the
paste-one-thing simplicity until the corpus itself outgrows it.
