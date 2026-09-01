---
id: REQ-004
type: requirement
title: Desktop UI for browsing and editing the knowledge base
status: accepted
approved: 2026-09-01
created: 2026-08-07
updated: 2026-09-01
links:
  - id: REQ-001
    rel: depends-on
  - id: REQ-003
    rel: depends-on
  - id: SRC-001
    rel: derived-from
  - id: DEC-002
    rel: constrained-by
---

Veri gets a local desktop UI over the same `veri/` directory the CLI and
MCP server read. The UI is a viewer/editor for the knowledge base — files
remain the source of truth per [[DEC-002]]; the UI never holds state the
files don't. Everything works offline with no accounts.

The shape, per the design reference in [[SRC-001]] and its successor
design sources:

- **Sidebar** — four collection panels (the type-grouped doc tree),
  grouped under the pivot's non-interactive layer headers WHY (Sources)
  / WHAT (Requirements, Decisions) / HOW (Work Orders) — grouping,
  never containers: no collection, count, or panel behavior changes
  ([[SRC-054]], [[REQ-036]]). The Work Orders panel groups its living
  list into status subgroups with done behind an expander
  ([[SRC-025]]); that panel and the work-order detail's status control
  are the lifecycle's whole surface — the Board and Outcomes views
  folded into Home and the Architecture view left the product
  ([[DEC-145]], [[DEC-144]]); outcome evidence and untested bets
  render on Home ([[REQ-035]]).
- **No dedicated Decision log or Graph screens** — the decisions
  chronology, status signals, and supersession pointers live in the
  Decisions panel, the documents themselves, and hover previews
  ([[SRC-023]]); the graph lives on the document surface as a local
  1-hop neighborhood map atop the Connections panel ([[SRC-024]]).

Two screens:

1. **Project home** — three panes: doc tree grouped by type; markdown
   reader with frontmatter rendered as a properties header; Connections
   panel showing inbound + outbound links as grouped cards.
2. **Work order detail** — the six-section work order with linked
   requirements/decisions as expandable inline cards, a status control, a
   Context Package panel (doc list, per-doc + total token estimate, "Copy
   for agent" and "Serve via MCP"), and the receipt after completion.

Cross-cutting: typing `[[` in any editor opens ID/title autocomplete;
`veri check` issues surface as quiet indicators on affected docs and in a
topbar chip; agent write-backs (context pulls, filed decisions, receipts)
appear as an activity feed on each doc.

## Acceptance criteria

- [ ] Opening a Veri project directory renders both screens against
      live files; external edits to `veri/` are reflected without restart
- [ ] All UI edits (status changes, appended notes, new links) are written
      as valid documents that pass `veri check`
- [ ] The Context Package panel shows exactly the package `get_context`
      would return for that work order, including token estimates
- [ ] `[[` autocomplete resolves every ID in the project and inserts a
      valid wiki-link
- [ ] Every `veri check` issue is visible in the UI on the affected
      document and in the global indicator
- [ ] No network calls
