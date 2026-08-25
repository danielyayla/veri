---
id: WO-101
type: work-order
title: "The dispatcher: a documented CI recipe that runs an agent on ready work"
status: done
claimed_by: claude-f0b156a1
claimed_at: 2026-08-25
approved: 2026-08-25
created: 2026-08-25
updated: 2026-08-25
links:
  - id: SRC-046
    rel: derived-from
  - id: WO-098
    rel: depends-on
  - id: WO-099
    rel: depends-on
  - id: REQ-007
    rel: constrained-by
  - id: REQ-025
    rel: constrained-by
  - id: DEC-002
    rel: constrained-by
  - id: WO-076
    rel: relates-to
---

## Summary

The queue gets a consumer. Finding F4 of [[SRC-046]]: nothing watches for ready work — a human opening a session is the factory's only motor. This work order ships the first, lowest-trust dispatcher: a documented, copyable GitHub Actions recipe that polls for dispatchable work orders (via [[WO-098]]'s `veri next`), spawns one headless agent per work order in an isolated worktree/branch with its context package, and ends at a pull request — never a merge. Core stays offline per [[DEC-002]]; the dispatcher lives at the edges, beside the existing check action ([[REQ-025]]). The kickoff prompt reuses the agent-handoff surface of [[REQ-007]].

## In scope

- A documented recipe (in the action's docs or a sibling workflow file users copy): on schedule or label, run `veri next`; if a work order is dispatchable, check out an isolated branch/worktree, invoke a headless coding agent with the work order's kickoff prompt/context package, and open a PR that includes the receipt and claim per [[WO-099]].
- Exit-silent behavior when nothing is ready — deterministic polling that spends no agent tokens on an empty queue.
- The recipe runs `veri check` on the result so the PR arrives with the gate already evaluated ([[REQ-025]]).
- Agent-agnostic framing per [[REQ-007]]: the recipe shows one concrete agent invocation and marks the seam where another agent CLI slots in.
- A short "trust ladder" note in the docs: recipe first, a local `veri watch` daemon as the named follow-up, auto-merge never.

## Out of scope

- `veri watch` (local daemon) — named follow-up, not this work order.
- Any network capability, agent invocation, or CI awareness inside core or the MCP server ([[DEC-002]]; core remains subprocess- and network-free).
- Auto-merge or auto-approve in any form — the human gates stay.
- Sandboxing/container hardening guidance beyond worktree isolation (candidate follow-up).
- Multi-repo dispatch.

## Requirements

- [[SRC-046]] — derived-from
- [[WO-098]] — depends-on
- [[WO-099]] — depends-on
- [[REQ-007]] — constrained-by
- [[REQ-025]] — constrained-by
- [[DEC-002]] — constrained-by
- [[WO-076]] — relates-to

## Acceptance tests

- [x] A repo following the documented recipe, with one ready work order, produces a PR authored by a headless agent containing implementation, receipt, and claim — with no human step between the ready stamp and the PR.
- [x] With no ready work orders, a scheduled run exits cleanly without invoking any agent.
- [x] The resulting PR runs the existing check action and surfaces its verdict.
- [x] The recipe never merges, approves, or promotes any document.
- [x] Recipe placement and the agent-invocation seam are filed as proposed decisions with rejected alternatives.
- [x] `veri check` passes; docs build/lint clean per repo convention.

## Receipts

- 2026-08-25 — 8631dd3 — .github/workflows/veri-dispatch.yml, site/docs/dispatch.html (+ Dispatch in every docs-strip), site/docs/ci.html, veri/decisions/DEC-106, DEC-107 — the dispatcher recipe: poll `veri next`, claim the head with `veri start` on an isolated `veri/<id>` branch, brief a headless agent ([[REQ-007]]'s kickoff shape over `veri context`), evaluate the gate with the check action, open a PR — never a merge. Placement and seam filed as [[DEC-106]] / [[DEC-107]] (proposed). Verified by a full local simulation against a bare origin — dispatch with a stub agent at the seam (branch pushed carrying implementation, receipt, and claim; `gh pr create` is the sole unexercised GitHub API call), idempotence (second poll skips a dispatched head), and the exit-silent empty queue; a live scheduled run was deliberately not triggered here — the queue held ready work (WO-104) and dispatching a real agent is the user's call. Workflow YAML parse-validated; `veri check` green — 0 issues.
