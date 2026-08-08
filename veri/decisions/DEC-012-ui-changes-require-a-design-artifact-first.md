---
id: DEC-012
type: decision
title: UI changes require a linked design artifact before implementation
status: active
created: 2026-08-08
updated: 2026-08-08
links:
  - id: REQ-004
    rel: constrains
---

## Choice

Any work order that touches `packages/ui` must link a design document
(`rel: designed-by`) before implementation begins. The design is produced
first — by Claude Design (the design plugin: critique, mockups, handoff
specs) — committed as a document in `veri/`, approved by the user, and only
then does the work order move to `in-progress`.

The design lives as a markdown document with frontmatter (`type: source`,
`status: imported`) so it participates in the link graph and gets pulled
into the context package handed to the implementing agent. Any exported
HTML mockups or images sit next to it.

## Rejected alternatives

- **Design inline in the work order body** — keeps everything in one file,
  but the design has no stable id, can't be linked from multiple work
  orders, and bloats the WO past what an implementing agent needs.
- **A new `design` document type** — cleaner semantics, but adding a type
  touches core parsing, `veri check`, and REQ-001 for marginal gain;
  `source` already means "imported external artifact", which a design is.
  Revisit if designs accumulate and need their own statuses.
- **Convention only (no linked doc)** — unenforceable; the whole point of
  Veri is that constraints ride along in the context package instead of
  living in someone's head.
