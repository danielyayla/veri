---
id: SRC-060
type: source
title: "Design — the Veri Skill Library: installable skills that coach the full lifecycle loop"
status: imported
kind: design
created: 2026-08-27
updated: 2026-08-27
links:
  - id: DEC-111
    rel: informed-by
  - id: REQ-032
    rel: informed-by
  - id: REQ-033
    rel: informed-by
  - id: REQ-008
    rel: informed-by
---

Design proposal for an installable skill library that coaches a user through Veri's whole loop — from "I have an idea" through years of maintenance — by staffing each of the loop's semantic gates with a conversational skill. Full proposal published as a Claude artifact: https://claude.ai/code/artifact/335dd7dc-0cdc-45d0-817e-68f376591209 (2026-08-27).

## Shape

Fourteen skills in six categories mapped one-to-one onto WF-001's loop, plus a cross-cutting Navigate layer:

- **Navigate**: `veri:wayfinder` (default; read-only front door routing vague utterances — "what should I work on next?", "why is this built this way?" — to the right gate), `veri:archaeology` (advanced; graph-walking "why" explanations with recorded-vs-inferred rationale kept distinct).
- **Discover**: `veri:product-discovery` (default; vague idea → problem brief SRC + foundational hypothesis REQs), `veri:user-discovery` (advanced; segments/JTBD with every claim tagged known-vs-assumed), `veri:evidence-intake` (default; staffs the evidence door — files SRCs with tests/supports/refutes and outcome-of links per [[REQ-033]]/[[DEC-113]]).
- **Define**: `veri:define` (default; requirements discovery as interview — pushes until criteria are observable or the kind flips to hypothesis per [[REQ-032]]).
- **Decide**: `veri:decide` (default; forces real alternatives, files proposed DECs with rejected paths and revisit conditions), `veri:approval-session` (advanced; gathers everything awaiting the stamp, relays explicit per-document user verdicts — never batches, never initiates approval).
- **Build**: `veri:plan-work` (default; accepted intent → small verifiable WOs with traced acceptance criteria, design-gate aware per [[DEC-012]]), `veri:implement` (default; WF-001's implementer rules as live discipline, with an orientation preamble — where are we, what exactly are we doing, what context is needed, what's the next sensible step).
- **Evaluate**: `veri:did-it-work` (default; separates built-what-we-said / holds-what-must-hold / did-the-bet-pay-off; files outcome SRCs, never auto-applies verdicts), `veri:review` (advanced; spec-fidelity code review — findings must cite the REQ/DEC/WO clause violated).
- **Maintain**: `veri:health` (default; periodic sweep for decay veri check's hard rules don't catch — stale docs, arrived revisit conditions, abandoned claims, untested bets, orphans — filed as a health-report SRC so trends compare), `veri:onboard` (advanced; a tour built from graph centrality, teaching the gates before the tools).

Nine skills ship by default. Eight of them form the loop's chain — wayfinder → product-discovery → define → decide → plan-work → implement → did-it-work → health — while `veri:evidence-intake`, also a default, feeds every stage rather than occupying one. Five advanced skills deepen individual gates without being required to operate the loop.

## Design principles (inherited, not invented)

1. Skills interview; humans decide — every artifact lands draft/proposed; no skill ever writes an `approved:` stamp ([[REQ-008]], [[DEC-111]]).
2. One skill per semantic gate; between gates, agents just work.
3. Handoffs are the document graph — each skill ends by naming which documents now await which gate and which skill picks them up; no orchestration layer.

## Capability gaps the design exposes

Four recurring gaps in the MCP surface: (1) `list_documents` by type/status/age (wayfinder, approval-session, health); (2) queue introspection over MCP — `veri next` equivalent plus claims (wayfinder, implement); (3) receipt→commit SHAs exposed structurally, not just as prose (health, review, archaeology); (4) a relay-approval affordance requiring an explicit per-document user verdict token (approval-session).
