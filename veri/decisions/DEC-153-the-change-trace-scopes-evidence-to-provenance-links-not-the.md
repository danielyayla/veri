---
id: DEC-153
type: decision
title: "The Change Trace scopes evidence to provenance links, not the requirement's whole neighborhood"
status: proposed
created: 2026-09-02
updated: 2026-09-02
links:
  - id: WO-164
    rel: constrains
---

## Choice

The trace's chain derivation (packages/ui/src/renderer/trace.ts) collects the evidence hop from two places only: sources reached from a chain requirement via `derived-from` (the provenance vocabulary REQ-038's advisory already enforces), and sources the work order itself links directly with any non-outcome rel (designed-by, constrained-by — deliberate, few). Outcome sources (tests/supports/refutes at a chain requirement, outcome-of at the WO) are carved out first and render as the Maintain node, never as evidence.

## Rejected alternatives

- **Walk every source in the requirement's 1-hop neighborhood** — REQ-004 carries ~30 inbound `designs` sources; the trace became a wall of design history instead of one turn of the loop, violating the list-everything-must-filter rule (SRC-016 via SRC-024).
- **Full neighborhood walk with a display cap (+K more)** — a cap windows the wall but still misrepresents the hop: those design sources are the surface's history, not the evidence this requirement came from; showing eight of thirty answers no question.
- **Configurable rel allowlist per project** — machinery without a driver; the provenance vocabulary is already fixed by REQ-038/DEC-113, so the trace reads it rather than inventing a parallel setting.

## Rationale

The Change Trace answers "who asked, what the agent produced, who approved, what reality said" for one work order (SRC-076 §Change Trace). Evidence in that sentence means provenance — the sources the requirement was derived from and the design sources the work order was cut against — which is exactly what `derived-from` and the WO's direct links record. Reusing the REQ-038 vocabulary keeps the trace consistent with what `veri check` calls an intuition-only bet: a requirement with no `derived-from` link renders the honest absence line instead of borrowing unrelated sources. Revisit if a project's provenance practice grows a second rel for evidence (e.g. `evidence-for`), or if traces routinely show absence lines while real evidence sits one rel away.
