---
id: WO-116
type: work-order
title: "The workflow, templates, and public story speak the intent loop"
status: done
claimed_by: claude-wo116
claimed_at: 2026-08-26
approved: 2026-08-26
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

- [x] workflow.md describes the full loop and the intent principle, and an implementer reading only it learns how hypotheses and outcome sources work
- [x] The source template shows outcome-evidence filing
- [x] README and docs-site positioning state the DEC-111 thesis
- [x] Terminal `veri check`: zero issues; only expected re-stamp advisories from the in-scope WF-001 amendment

## Receipts

- 2026-08-26 — 93ee663 — veri/workflow.md, veri/templates/source.md, README.md, site/index.html, veri/decisions/DEC-117 — WF-001's path of work amended to state the full lifecycle loop (evidence → understanding → product intent → requirements → decisions → bounded work → agent implementation → verification → learning → revised intent) and the humans-define-intent / agents-execute-within-intent principle with its four gate points; new rule 9 teaches constraint vs hypothesis, outcome targets, outcome-source filing (tests/supports/refutes + outcome-of), and the untested-bet advisory. Source template gains an outcome-evidence parenthetical with a links: example. README lede and site title/meta/hero restate the DEC-111 thesis; mechanism copy untouched. Terminal veri check: 0 issues, 16 advisories — identical to the pre-existing set (WF-001's re-stamp drift advisory already stood from WO-113 and now covers this amendment too; awaits Daniel's batch-end re-approval). Placement choices in DEC-117 (proposed).
