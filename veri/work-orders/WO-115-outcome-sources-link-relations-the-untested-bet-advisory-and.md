---
id: WO-115
type: work-order
title: "Outcome sources: link relations, the untested-bet advisory, and context inclusion"
status: in-progress
claimed_by: claude-wo115
claimed_at: 2026-08-26
approved: 2026-08-26
created: 2026-08-26
updated: 2026-08-26
links:
  - id: REQ-033
    rel: implements
  - id: REQ-032
    rel: depends-on
  - id: DEC-111
    rel: constrained-by
  - id: SRC-050
    rel: derived-from
# binds:         # code this work order claims (optional)
#   paths: []    # repo-root-relative globs
#   tests: []    # test files proving it (path or path::name)
---

## Summary

Implements REQ-033. Sources gain outcome link relations (`tests`, `supports`, `refutes`) toward requirements, plus a link to the work order that shipped the change. `veri check` surfaces an advisory — never a violation — for a hypothesis requirement whose linked work orders are all done but which has no linked outcome source (an untested bet). Context packages for a requirement include its outcome sources so future work sees what reality said. No status is ever auto-changed by outcome evidence.

## In scope

- Outcome link relations (tests / supports / refutes) validated in core
- Untested-bet advisory in the check derivation (advisory tier only)
- Outcome sources included in the context package of the requirement they test
- Tests covering the relations, the advisory trigger and non-trigger, and context inclusion

## Out of scope

- Metrics ingestion, telemetry, or any automated outcome measurement
- Auto-promotion or auto-revision of requirements based on evidence
- New work-order statuses
- UI surfacing beyond what existing link rendering already provides

## Requirements

- [[REQ-033]] — implements
- [[REQ-032]] — depends-on
- [[DEC-111]] — constrained-by
- [[SRC-050]] — derived-from

## Acceptance tests

- [ ] A SRC can link to a REQ with rel tests/supports/refutes and to a WO with an appropriate rel, and both validate
- [ ] A hypothesis REQ with all linked WOs done and no outcome source yields the untested-bet advisory
- [ ] The advisory does not fire for constraints, for hypotheses with open WOs, or once an outcome source is linked
- [ ] A requirement's context package contains its linked outcome sources
- [ ] The advisory never appears in the violations array

## Receipts

(none yet)
