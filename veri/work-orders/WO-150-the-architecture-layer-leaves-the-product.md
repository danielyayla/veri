---
id: WO-150
type: work-order
title: "The architecture layer leaves the product"
status: backlog
approved: 2026-09-01
created: 2026-09-01
updated: 2026-09-01
links:
  - id: REQ-022
    rel: removes
  - id: REQ-019
    rel: serves
  - id: SRC-066
    rel: derived-from
  - id: SRC-067
    rel: designed-by
binds:
  paths:
    - packages/ui
    - packages/core
    - packages/cli
---

## Summary

SRC-066's verdict on the module registry, decision architecture constraints, import scanning, and the map and lattice views: a dependency linter living inside an intent tool. It fails PRD-003's own filter — it neither improves product judgment nor closes the learning loop — and the playbook puts this class of control in lint and hooks, not in the system of record. Users who want module constraints bring their own linter; the choice lives in an ordinary decision's prose. BLOCKERS: this retires accepted intent (REQ-022) — evidence, a proposed decision, and Daniel's retirement stamp come first; and the UI removal touches the design-gated path, so a design note must be linked designed-by before start. binds.paths declares packages/ui below (frontmatter edit applied with the filing, since file_work_order has no binds parameter).

## In scope

- Remove core architecture.ts, the arch-unknown-module / arch-conflict / arch-violation rules, and the CLI veri architecture command
- Remove the UI Architecture view (both tabs) and the Home architecture card, with the design note filed as a source and linked designed-by
- Deprecate the architecture: block on decisions: existing documents keep parsing (passthrough), the field is documented as inert
- Keep the workflow modules: registry — get_intent and veri intent still read it
- Docs and site reference updated

## Out of scope

- Any replacement linter or migration of existing constraints (the two active constraint-bearing decisions get a note, not tooling)
- get_intent, binds, and the module registry (they serve context, not architecture enforcement)
- Removing REQ-022's file (retirement is Daniel's stamp on the requirement, not a deletion)

## Requirements

- [[REQ-022]] — removes
- [[REQ-019]] — serves
- [[SRC-066]] — derived-from

## Acceptance tests

- [ ] No arch-* rule kinds exist in check or its types; fixtures removed
- [ ] veri architecture is gone from the CLI dispatch and help
- [ ] The app builds and runs with no Architecture view or Home card; a design source is linked designed-by
- [ ] A decision carrying an architecture: block still parses with zero issues and the docs name the field inert
- [ ] get_intent still resolves modules from the registry; full suite green

## Receipts

(none yet)
