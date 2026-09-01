---
id: DEC-144
type: decision
title: "The architecture layer leaves the product — module boundaries belong to lint and prose"
status: active
approved: 2026-09-01
created: 2026-09-01
updated: 2026-09-01
links:
  - id: WO-150
    rel: constrains
  - id: REQ-022
    rel: removes
  - id: DEC-058
    rel: supersedes
  - id: DEC-061
    rel: supersedes
  - id: DEC-062
    rel: supersedes
  - id: DEC-059
    rel: informed-by
  - id: DEC-060
    rel: informed-by
  - id: SRC-066
    rel: derived-from
---

## Choice

Veri stops modeling module dependency boundaries. The `architecture:` frontmatter block goes inert: existing blocks keep parsing (schemas are passthrough) and bind nothing. The machinery retires end to end — the `arch-unknown-module`, `arch-conflict`, and `arch-violation` rules, the compiled projection ([[DEC-058]]), the observed-import collector ([[DEC-061]]), the severity escalation ([[DEC-062]]), `veri architecture` in the CLI, and the app's Architecture view and Home card.

A project that wants enforced boundaries brings a dependency linter — dependency-cruiser, an ESLint boundaries plugin, a pre-commit hook — which is enforcement at act-time, where the playbook locates this class of control. The *choice* of a boundary lives where every other choice lives: an ordinary decision's prose, retrievable through `get_context` and `get_intent` like any other constraint, with the linter config free to cite the DEC id in a comment.

What survives, deliberately: the module registry on WF-001's frontmatter ([[DEC-059]], narrowed) — it serves code-to-intent lookup (`get_intent`, `veri intent`), which is retrieval, not enforcement. And [[DEC-060]]'s prose remains Veri's own stated architecture — core depends on nothing, surfaces never couple sideways — with only the machine channel that carried it retiring; the two active constraint-bearing decisions get a note, not a migration.

## Rejected alternatives

- **Keep the layer (status quo).** Its best case is [[DEC-058]]'s own argument at full strength: a violation that answers "who decided this, when, and why" in the same breath as "what broke", surfaced to an agent at the exact moment of the tempting import — provenance no dependency linter offers, already built and tested across four work orders (WO-066/067/068/069). It loses on [[SRC-066]]'s evidence against PRD-003's own filter: the layer neither improves product judgment nor closes the learning loop, and in its entire life on this repository the observed tier has caught no real erosion — the boundaries hold by convention and review — while carrying four rule kinds, an import scanner, a severity subsystem, and two app views. A dependency linter living inside an intent tool is scope, not leverage.
- **Keep the intended half, drop the observed half.** Its best case: rationale-carrying boundaries still reach every context package cheaply, without the scanner's weight. It loses because a machine-readable rule the machine no longer checks is prose wearing YAML — schema validation, registry resolution, and conflict detection all maintained so a block can assert what a sentence in the decision body already asserts, and the context package carries the decision body either way.
- **Extract it — a standalone veri-arch hook or linter reading decision frontmatter.** Its best case: playbook-shaped (act-time enforcement) and provenance kept. It loses because it is a second product to maintain doing a job mature linters already do, still coupled to Veri's corpus format — and anyone who wants provenance in their lint output can cite the DEC id in the rule's comment for free.

## Rationale

The layer was [[REQ-021]]'s principle — drift is mechanical, not social — extended from documents to dependency structure, and the extension was reasonable. But Veri's leverage is judgment about what to build, not enforcement of how code imports code: enforcement belongs at act-time in the toolchain that already owns it, and reasoning belongs where a reader looks for it, in the decision that made the call. The sacrifice is named — violations lose their built-in provenance chain, and Veri's corpus no longer detects two decisions disagreeing about an edge — accepted because in practice the chain answered questions nobody asked. Retiring [[REQ-022]] is the user's stamp on the requirement itself; this decision records the why, and WO-150 carries the removal (design gate and all).

Revisit when: an agent-heavy erosion incident ships through both review and lint where a governed, provenance-carrying rule would demonstrably have caught it — that is REQ-022's founding premise, and real evidence of it is exactly what would reopen this fork.
