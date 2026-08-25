---
id: WO-099
type: work-order
title: "Claim semantics: work orders record which session holds them"
status: in-progress
claimed_by: claude-f0b156a1
claimed_at: 2026-08-25
approved: 2026-08-25
created: 2026-08-25
updated: 2026-08-25
links:
  - id: SRC-046
    rel: derived-from
  - id: WO-098
    rel: relates-to
  - id: REQ-026
    rel: constrained-by
  - id: REQ-006
    rel: constrained-by
  - id: DEC-076
    rel: constrained-by
  - id: DEC-038
    rel: constrained-by
---

## Summary

Frontmatter claim fields (`claimed_by`, `claimed_at`) set when a work order enters in-progress, with `veri check` flagging double-claims and stale claims, and a workflow-document convention of worktree-per-work-order. Finding F2 of [[SRC-046]]: nothing records that a session holds a work order, so concurrent sessions collide and are detected only by human heuristics (fresh mtimes, uncommitted diffs in scope) — a lived problem in this repo's own self-hosted development. Companion to [[WO-098]]: ready says "an agent may take this," the claim says "an agent has."

## In scope

- `claimed_by` (free-text agent/session identity) and `claimed_at` (date, local calendar per [[DEC-076]]) frontmatter on work orders, required at in-progress, cleared or superseded at done — exact lifecycle filed as a proposed decision.
- `veri check` violations for: in-progress without a claim; two in-progress work orders sharing a claim identity where that is ruled invalid; and a stale-claim advisory (threshold filed as a proposed decision) consistent with multi-committer semantics ([[REQ-026]]).
- MCP writeback: the server sets the claim when an agent moves a work order to in-progress, per the parity principle of [[DEC-038]].
- The workflow document gains the worktree-per-work-order convention for parallel agent runs (a workflow edit, proposed for the user's approval, not silently applied).

## Out of scope

- The `ready` status and `veri next` — [[WO-098]].
- Any enforcement via file locks, PIDs, or process inspection — claims are declarations in the knowledge base, checked mechanically, not OS-level locks.
- Dispatcher behavior on claims — finding F4's work order.
- Retrofitting claims onto done work orders.

## Requirements

- [[SRC-046]] — derived-from
- [[WO-098]] — relates-to
- [[REQ-026]] — constrained-by
- [[REQ-006]] — constrained-by
- [[DEC-076]] — constrained-by
- [[DEC-038]] — constrained-by

## Acceptance tests

- [ ] Moving a work order to in-progress without claim fields is a check violation; with them, check passes.
- [ ] A second claim on an already-claimed work order surfaces as a violation or advisory per the filed decision.
- [ ] A stale claim (older than the decided threshold with no receipt activity) surfaces as an advisory.
- [ ] The MCP write path records the claim; the CLI path accepts it equivalently.
- [ ] Claim lifecycle and staleness threshold are filed as proposed decisions with rejected alternatives.
- [ ] `veri check` passes; tests colocated per repo convention.

## Receipts

(none yet)
