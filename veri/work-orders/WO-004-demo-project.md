---
id: WO-004
type: work-order
title: Demo project — skiff fixture for init --demo
status: backlog
created: 2026-08-06
updated: 2026-08-06
links:
  - id: REQ-002
    rel: delivers
  - id: WO-002
    rel: depends-on
  - id: SRC-001
    rel: derived-from
---

## Summary

Port the "skiff" invoicing-app knowledge base from the design mockup
([[SRC-001]]) into real Veri documents bundled with the CLI, installed by
`veri init --demo`. This is the first thing every new user and every
screenshot shows.

## In scope

- Full skiff content as Veri documents: 4 requirements, 5 decisions
  (DEC-003 superseded by DEC-005 with the Handlebars→Typst rationale
  chain), 5 work orders with receipts on the two done ones, 2 sources
- The two deliberate health issues preserved (WO-004/no requirements,
  REQ-004/broken SRC-003 link) so `veri check` has something honest to
  show in the demo — documented in the demo README
- `veri init --demo` wired end-to-end

## Out of scope

- Any changes to core or check semantics to accommodate demo content
- Additional demo scenarios or project types

## Requirements

From [[REQ-002]]: the `veri init --demo` acceptance criterion, verbatim.

## Acceptance tests

- [ ] `veri init --demo && veri check` reports exactly the 2 intended
      issues and nothing else
- [ ] `get_context("WO-002")` on the demo returns the package matching the
      mockup's context panel (REQ-002, DEC-005, DEC-002 equivalents)
- [ ] Every demo document renders cleanly on GitHub

## Receipts

(none yet)
