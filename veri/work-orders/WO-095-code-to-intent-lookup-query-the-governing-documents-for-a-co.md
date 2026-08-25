---
id: WO-095
type: work-order
title: "Code-to-intent lookup: query the governing documents for a code path"
status: backlog
created: 2026-08-25
updated: 2026-08-25
links:
  - id: REQ-021
    rel: implements
  - id: SRC-044
    rel: derived-from
  - id: WO-088
    rel: relates-to
  - id: DEC-059
    rel: constrained-by
  - id: DEC-060
    rel: constrained-by
  - id: DEC-038
    rel: constrained-by
---

## Summary

A core derivation plus MCP tool and CLI surface that answers "what governs this code path?" from receipts, code bindings, and the module registry — a receipts-grounded alternative to competitors' hosted code indexes.

Give agents the reverse lookup Veri already has the data for: from a code path to the documents that govern it. Competitors answer "how the files connect" with a hosted code index ([[SRC-044]]); Veri can answer with grounded facts it already records — receipts name files touched per work order, code bindings exist on work orders ([[WO-088]]), and the module registry in workflow frontmatter ties paths to purpose ([[DEC-059]]). What is missing is a query surface.

## In scope

- A core function: given a repo-relative path (file or directory), return the work orders whose receipts or code bindings touch it, the module registry entry covering it, and the requirements/decisions reachable from those work orders via links — ranked so direct bindings outrank receipt mentions outrank module-level matches.
- An MCP tool exposing it (name to be decided; file the naming/shape choice as a proposed decision), so an agent editing a file can ask "what governs this path?" before changing it.
- A CLI surface (e.g. `veri context --path <p>` or a subcommand — decide during implementation) printing the same result, per the parity principle of [[DEC-038]].
- Derivation is pure core over the parsed knowledge base and host-collected facts, consistent with [[DEC-040]] and [[DEC-060]].

## Out of scope

- Any code parsing, indexing, or embedding — the lookup reads only what the knowledge base already records (receipts, bindings, module registry). Import-graph data from the architecture checks may be reused if already available in core, but no new collection.
- Changes to how receipts or bindings are written.
- UI surfacing in the desktop app (candidate follow-up).
- Multi-repo support.

## Acceptance tests

- [ ] Given a path touched by past receipts, the lookup returns those work orders and their linked requirements and decisions, ranked as specified.
- [ ] Given a path covered only by the module registry, the lookup returns the module entry and says no document-level matches exist.
- [ ] The MCP tool and CLI surface print the same derivation from core.
- [ ] Tool description makes clear the results are grounded in receipts and bindings, not a code index.
- [ ] Non-trivial choices (tool name, ranking, result shape) are filed as proposed decisions.
- [ ] `veri check` passes; tests colocated per repo convention.

## Requirements

- [[REQ-021]] — implements
- [[SRC-044]] — derived-from
- [[WO-088]] — relates-to
- [[DEC-059]] — constrained-by
- [[DEC-060]] — constrained-by
- [[DEC-038]] — constrained-by

## Receipts

(none yet)
