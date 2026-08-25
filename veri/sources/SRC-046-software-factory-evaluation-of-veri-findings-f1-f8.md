---
id: SRC-046
type: source
title: "Software-factory evaluation of Veri — findings F1–F8"
status: imported
created: 2026-08-25
updated: 2026-08-25
links:
  - id: SRC-044
    rel: relates-to
  - id: WO-088
    rel: relates-to
  - id: REQ-008
    rel: relates-to
---

Evaluation produced 2026-08-25 in a working session with Daniel, prompted by a second software-factory YouTube transcript (an open-source Rust pipeline: label-triggered triage and implementation agents polling GitHub issues, worktree isolation, scheduled bug-finder jobs, version-controlled workflow prompts). Distinct from the hosted "Software Factory" product covered by [[SRC-044]]. Full write-up published as "The Veri Factory Playbook" artifact; this source preserves the evaluation half.

## Frame

A software factory has two halves: a **spec half** (vague intent becomes implementation-ready, verifiable tickets) and an **execution half** (ready work is noticed, dispatched to agents, and verified). Veri's spec half is ahead of the reference implementations: context packages, structural approval gates (unapproved documents visible but never binding), `veri check` in CI, receipts, code bindings and drift detection, agent self-serve and self-verify over MCP. The gaps cluster on the execution half.

## Findings

### F1 — No dispatchable state in the work-order lifecycle (core gap)

`backlog → in-progress → done` has no state meaning "cleared for autonomous execution." Readiness today is implicit — links approved plus unrecorded human intent — so nothing can mechanically distinguish "specced, waiting on Daniel" from "go." Every factory trigger needs exactly this bit. Recommendation: a `ready` status (backlog → ready → in-progress → done), entered only by the user's stamp and only when link gates pass, plus `veri next` printing the next dispatchable work order — a deterministic, token-free polling primitive.

### F2 — No claim semantics for parallel agents (core gap)

Nothing records that a session holds a work order; concurrent sessions collide, detected today only by human heuristics (fresh mtimes, uncommitted diffs in scope) — a lived problem in Veri's own self-hosted development. Recommendation: `claimed_by` / `claimed_at` frontmatter set on entering in-progress; `veri check` flags double-claims and stale claims; workflow convention of worktree-per-work-order.

### F3 — MCP writeback cannot carry a full work order (core gap; verify current state)

At evaluation time the working understanding was that `file_work_order` persists title and summary but drops the body — scope sections, acceptance tests, links — forcing a two-step workaround (file over MCP, then rewrite the file raw). The triage agent is the factory's most important author. Recommendation: the `file_*` tools accept the full template as structured, validated fields. Note: the tool schema now advertises `in_scope`, `out_of_scope`, and `acceptance_tests` fields, so this finding may be partially or fully addressed; verify before acting.

### F4 — No dispatcher; the queue has no consumer (missing layer)

Nothing watches for ready work; a human opening a session is the factory's only motor. Recommendation: keep core offline and ship the dispatcher at the edges, in trust order — first a documented recipe extending the existing GitHub Action to run a headless agent against `veri next`; later `veri watch`, a local daemon spawning one agent per ready work order in its own worktree.

### F5 — Approval throughput becomes the bottleneck (scaling friction)

One `veri approve <id>` at a time; no pending-queue review surface. At factory scale slow review stalls the line, and the failure mode is rubber-stamping. Recommendation: `veri approve --review` stepping through pending documents; an app inbox showing each proposal with what it would newly bind.

### F6 — Receipts are prose; the ledger cannot be queried (scaling friction)

No PR URL, check outcome, or test result in receipts; no throughput or cycle-time view. Recommendation: structured receipt fields (pr, checks, tests, agent) and `veri status` — work orders by state with age and claim.

### F7 — One workflow document, but a factory runs several workflows

Triage, implementation, and scheduled prospecting are different processes; extra workflows today live in untracked prompt files. Recommendation: multiple workflow documents with the same approval lifecycle, and a selector for which one leads a context package.

### F8 — Intake stops at the filesystem (deliberate, bridgeable)

GitHub issues, support threads, and monitoring do not reach `veri import` on their own. The no-network core is right; ship bridges outside core (e.g. an Action converting a labeled issue into a source-document PR).

## Disposition

F1–F4 selected for work orders in this session. F5–F8 noted for later intake. Through-line: Veri's differentiation is accountable automation — add agent-side throughput while the two human gates (approve, merge) stay exactly where they are.
