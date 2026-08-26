---
id: REQ-034
type: requirement
title: "The project teaches its own lifecycle: workflow, templates, and public docs speak the intent loop"
status: accepted
approved: 2026-08-26
created: 2026-08-26
updated: 2026-08-26
links:
  - id: DEC-111
    rel: derived-from
  - id: SRC-050
    rel: derived-from
  - id: REQ-032
    rel: relates-to
  - id: REQ-033
    rel: relates-to
---

Veri's thesis (DEC-111) and the machinery that implements it (REQ-032 requirement kinds, REQ-033 outcome sources) are now in core — but the documents that teach the project to humans and agents still describe the pre-pivot lifecycle. The workflow document presents the path of work as ending at receipts; it must present the full loop — evidence → understanding → product intent → requirements → decisions → bounded work → agent implementation → verification → learning → revised intent — and state the operating principle that humans define and revise intent while agents execute within it, with human gates at semantic boundaries.

Concretely: the workflow document explains when a requirement is a constraint versus a hypothesis, and that outcome evidence re-enters as sources linked to the hypothesis it tests; the source template shows how to file outcome evidence; the public story (repository README and the docs site, where positioning appears) states the thesis — implementation is cheap, product judgment is not — rather than presenting Veri as an agent-context utility. An agent or newcomer who reads only the workflow document and templates should learn the loop, not just the left half of it.

## Acceptance criteria

- [ ] The workflow document describes the full lifecycle loop including verification, learning, and revised intent, and names the humans-define-intent / agents-execute-within-intent principle.
- [ ] The workflow document tells implementers how constraint and hypothesis requirements differ and how outcome evidence is filed.
- [ ] The source template documents outcome-evidence filing (tests/supports/refutes toward a requirement, outcome-of toward the shipping work order).
- [ ] The README and docs-site positioning state the DEC-111 thesis.
- [ ] `veri check` passes with zero issues after the changes.
