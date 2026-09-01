---
id: DEC-058
type: decision
title: "Architecture constraints ride decision frontmatter; the intended architecture is a compiled projection"
status: superseded
superseded_by: DEC-144
approved: 2026-08-20
created: 2026-08-20
updated: 2026-09-01
links:
  - id: REQ-001
    rel: informed-by
  - id: REQ-021
    rel: extends
  - id: REQ-008
    rel: informed-by
---

## Choice

A decision may carry a machine-readable `architecture:` block in its frontmatter alongside the prose body:

```yaml
architecture:
  constraints:
    - from: core
      to: [ui, mcp, cli, electron]
      allowed: false
```

Each constraint is `{from, to, allowed}` where `from`/`to` name modules and accept a single name or a list. The intended architecture is never an authored document: it is a deterministic projection assembled by walking every **active** decision and collecting its constraints, each annotated with the DEC id it came from — the same assembly-from-source-documents pattern as context packages. Proposed decisions contribute nothing until approved; superseding a decision retires its constraints automatically.

Module names are resolved against a small module registry (name → path → one-line purpose) that lives outside any decision. Its exact home — a dedicated registry document versus derivation from `package.json` workspaces with annotated purposes — is deliberately left to the first implementing work order, as is whether module ids support hierarchy or globs (`plugins/*`, `billing/schema`); survey of six project archetypes (layered, hexagonal, microservices, plugin, ML pipeline, Veri itself) showed flat `{from, to, allowed}` expresses all of them, with hierarchy/globs wanted only by the microservices and plugin cases.

Two hard requirements on any implementation: (1) the `architecture` key gets a real schema in core, so a malformed block or an unknown module name is a `veri check` failure — a constraint that silently never fires because of a typo is worse than no constraint; (2) a projection surface (at minimum a CLI printout) ships in the same work order as the convention, so the rules are never write-only.

## Rejected alternatives

- **A single authored architecture document (`veri/architecture.yaml` or one ARCH doc holding all rules)** — separates every rule from its rationale, reintroduces the stale-architecture-document problem Veri exists to kill, and needs its own change-approval story; the decision lifecycle (proposed → active → superseded, with the `approved:` stamp) already provides provenance, gating, and retirement for free.
- **Inline tags or comments in the decision body** (e.g. HTML comments or magic fenced blocks) — invisible in the reader, fragile under editing, and a second machine-readable channel next to the one the format already has; frontmatter is where Veri puts structured meaning (`design_gate_paths`, DEC-039).
- **Expressing constraints as typed links** — links point at document ids; architecture constraints relate *modules*, which are not documents. Overloading `rel:` to carry module pairs would corrupt the link graph's semantics.
- **A new architecture document type per module** — dozens of new documents to author and keep current, most restating what the repo already knows; the derived/authored split says humans should write only what code cannot explain.

## Rationale

The format already permits this: schemas are passthrough and unknown frontmatter keys are preserved, never rejected (REQ-001, schema.ts), so the convention costs no format change — only validation and assembly. DEC-039's `design_gate_paths` establishes the exact pattern: structured, machine-actionable frontmatter on a governed document, enforced by `veri check`.

Carrying constraints on decisions makes the rule inseparable from its reason. A violation report can cite the governing DEC, its approval date, and its rationale — which is what distinguishes this from dependency-cruiser-style lint rules, and is the context an agent needs at the moment it is tempted to add a convenient import. Approval gating means the intended architecture cannot change without the user's stamp (REQ-008); supersession means it cannot go stale; and two active decisions claiming opposite things about the same edge become mechanically detectable at assembly time. This extends REQ-021's contract — drift is mechanical, not social — from documents to dependency structure.
