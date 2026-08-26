---
id: WO-114
type: work-order
title: "Requirement kind: constraint vs hypothesis in core, check, and rendering"
status: in-progress
claimed_by: claude-wo114
claimed_at: 2026-08-26
approved: 2026-08-26
created: 2026-08-26
updated: 2026-08-26
links:
  - id: REQ-032
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

Implements REQ-032. The REQ schema gains `kind: constraint | hypothesis` (absent means constraint) and an optional `outcome: {metric, target}` block. `veri check` flags a hypothesis with no declared outcome as a violation-tier schema issue or advisory per REQ-032's criteria. Kind and outcome render wherever a requirement is shown: CLI document output, context packages, and the UI's requirement views. Purely additive — no existing document needs editing for the suite to pass.

## In scope

- `kind` and `outcome` fields in the core requirement schema (parse + validate)
- Check rule: hypothesis without an outcome declaration is flagged
- Rendering of kind/outcome in CLI output, context-package sections, and UI requirement views
- Template update: `veri/templates/requirement.md` documents the field
- Tests covering parse, default (absent = constraint), the check rule, and rendering

## Out of scope

- Any new work-order statuses (implemented/validating/validated) — deferred per SRC-050
- Outcome-source link relations and the untested-bet advisory (WO for REQ-033)
- Backfilling `kind:` onto existing requirements
- Confidence scores or evidence-strength fields

## Requirements

- [[REQ-032]] — implements
- [[DEC-111]] — constrained-by
- [[SRC-050]] — derived-from

## Acceptance tests

- [ ] A REQ with `kind: hypothesis` and an outcome block parses and round-trips
- [ ] A REQ with no `kind` behaves as a constraint everywhere
- [ ] `veri check` flags a hypothesis REQ with no outcome declared
- [ ] Kind is visible in CLI rendering, context packages, and the UI
- [ ] Full check suite passes with zero edits to existing documents

## Receipts

(none yet)
