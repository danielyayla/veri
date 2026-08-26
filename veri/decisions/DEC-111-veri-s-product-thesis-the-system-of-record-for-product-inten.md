---
id: DEC-111
type: decision
title: "Veri's product thesis: the system of record for product intent, not an agent-context utility"
status: active
approved: 2026-08-26
created: 2026-08-26
updated: 2026-08-26
links:
  - id: SRC-050
    rel: derived-from
---

## Choice

Veri positions itself as the system of record for product intent in an agent-built software world — an AI-native product-engineering operating system. It optimizes for what stays scarce when agents solve implementation: human judgment about what to build, why, for whom, under what constraints, and whether the result actually worked. The operating principle is "humans define and revise intent; agents execute within intent" — human gates sit at semantic boundaries (evidence → requirement, requirement → decision, implementation → product judgment), not at every action. New features must pass the filter: does this improve the quality of human judgment, preserve intent, steer agents, or close the learning loop? If not, Veri does not own it.

## Rejected alternatives

- **"Veri gives AI agents better project context" as the primary thesis** — useful but narrow; competes at the HOW layer, which loses value as agents improve, and fails to explain why sources, outcomes, and human gates are core rather than peripheral.
- **"Markdown brain" / knowledge-management framing** — optimizes for comprehensiveness of memory rather than accountability of memory; drifts toward taxonomy bloat (plans, investigations, freeform memory files) with no checkable lifecycle.
- **General project-management positioning (AI-native Jira)** — execution-board-centric; treats WOs as tickets rather than as the smallest bounded product change currently believed worth making, and has no evidence or learning loop.

## Rationale

If implementation commoditizes, "better context for coding agents" is a feature, not a product — and HOW-stage tooling is exactly the wrong place to compete. The scarce input becomes the quality of the product model humans maintain: evidence, intent, tradeoffs, and validated outcomes. Veri's existing machinery already anticipates this (draft/proposed statuses with human promotion, provenance links from SRC through WO, receipts) — this decision names the center of gravity so future scope questions have a filter. Origin: SRC-050.
