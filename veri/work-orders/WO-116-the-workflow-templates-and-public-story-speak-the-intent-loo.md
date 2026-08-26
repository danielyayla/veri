---
id: WO-116
type: work-order
title: "The workflow, templates, and public story speak the intent loop"
status: backlog
created: 2026-08-26
updated: 2026-08-26
links:
  - id: REQ-034
    rel: implements
  - id: DEC-111
    rel: constrained-by
  - id: SRC-050
    rel: derived-from
# binds:         # code this work order claims (optional)
#   paths: []    # repo-root-relative globs
#   tests: []    # test files proving it (path or path::name)
---

## Summary

Implements REQ-034. Amends the workflow document (WF-001) to present the full lifecycle loop (evidence → intent → requirements → decisions → bounded work → implementation → verification → learning → revised intent), state the humans-define-intent / agents-execute-within-intent principle with its gate points, and add implementer guidance for constraint-vs-hypothesis requirements and outcome-evidence filing. Updates the source template with an outcome-evidence section, and updates README and docs-site positioning to the DEC-111 thesis. Documentation and workflow prose only — no code.

## In scope

- veri/workflow.md: lifecycle loop, intent principle, human gates, constraint/hypothesis guidance, outcome-evidence guidance
- veri/templates/source.md: outcome-evidence filing (tests/supports/refutes, outcome-of)
- README positioning and the docs site's positioning surface
- Any WF-001 frontmatter/link updates the amendment requires

## Out of scope

- Any code changes in packages/
- New document types or statuses
- The app home view (WO for REQ-035)
- Re-approving drifted documents (batch-end pass)

## Requirements

- [[REQ-034]] — implements
- [[DEC-111]] — constrained-by
- [[SRC-050]] — derived-from

## Acceptance tests

- [ ] workflow.md describes the full loop and the intent principle, and an implementer reading only it learns how hypotheses and outcome sources work
- [ ] The source template shows outcome-evidence filing
- [ ] README and docs-site positioning state the DEC-111 thesis
- [ ] Terminal `veri check`: zero issues; only expected re-stamp advisories from the in-scope WF-001 amendment

## Receipts

(none yet)
