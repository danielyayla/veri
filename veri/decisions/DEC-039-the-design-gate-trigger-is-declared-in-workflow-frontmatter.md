---
id: DEC-039
type: decision
title: "The design-gate trigger is declared in workflow frontmatter"
status: proposed
created: 2026-08-18
updated: 2026-08-18
links:
  - id: WO-042
    rel: constrains
  - id: DEC-012
    rel: follows-from
---

## Choice

`checkDesignGate` reads its trigger paths from a typed optional frontmatter field on the project's workflow document — `design_gate_paths`, a list of path substrings. A started work order whose body mentions any declared path must link a design document (`rel: designed-by`), exactly as [[DEC-012]] requires; with no paths declared the gate is inert. Core keeps only the mechanism; each project declares the values — this repo declares `packages/ui` in `veri/workflow.md`.

## Rejected alternatives

- **Keep `packages/ui` hardcoded in core** — ships this repo's directory layout to every user's project; the exact self-hosting leak [[REQ-019]] flags.
- **A separate config file** (`veri/config.yml` or similar) — a second kind of truth outside the document model: unapprovable, unlinkable, invisible to `veri check`. The same reasoning that moved the workflow out of CLAUDE.md ([[DEC-018]]).
- **A new config document type** — touches parsing, checking, and the type system for one field; [[DEC-012]] already rejected type proliferation for less.
- **Deriving triggers from workflow body prose** — rule text is for humans; parsing it is brittle and unmachine-readable.

## Rationale

The workflow document is already where rules for implementers live, and it is approvable, linkable, checkable, and delivered as the first section of every context package. Declaring the machine-readable trigger in its frontmatter keeps the human rule and its enforcement in one governed document — and `.passthrough()` frontmatter (REQ-001) means older cores ignore the field gracefully.
