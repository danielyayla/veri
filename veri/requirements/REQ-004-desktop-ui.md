---
id: REQ-004
type: requirement
title: Desktop UI for browsing and editing the knowledge base
status: accepted
approved: 2026-08-19
created: 2026-08-07
updated: 2026-08-19
links:
  - id: REQ-001
    rel: depends-on
  - id: REQ-003
    rel: depends-on
  - id: SRC-001
    rel: informed-by
  - id: DEC-002
    rel: constrained-by
---

Veri gets a local desktop UI over the same `veri/` directory the CLI and
MCP server read. The UI is a viewer/editor for the knowledge base — files
remain the source of truth per [[DEC-002]]; the UI never holds state the
files don't. Everything works offline with no accounts.

Two screens, per the design reference in [[SRC-001]] as amended by
[[SRC-023]] (the Decision log screen is retired; its chronological feed,
status signals, and supersession pointers live on in the Decisions type
panel, the documents themselves, and hover previews), [[SRC-024]]
(the Graph screen is retired; the graph lives on the document surface
instead — a local 1-hop neighborhood map at the top of the Connections
panel, not a screen), [[SRC-025]] (the Board screen is retired; its
status columns live on as status subgroups in the Work Orders type
panel's living list, with done behind the panel's expander), and
[[SRC-047]] (the board returns as the ▤ Board view tab — a
four-column kanban over the [[WO-098]] lifecycle, opened from a
`▤ Board` row atop the Work Orders type panel, DONE windowed behind an
expander; the collection row stays a panel toggle like every other
collection, and the panel's subgroups are unchanged), and [[SRC-049]]
(Architecture is promoted to primary navigation — an always-rendered
`⌗ Architecture` sidebar view row below the four collections opens the
existing one-instance Architecture tab, the view's empty-state card
serving projects with no module registry; the Home ARCHITECTURE card,
⌘K entry, and `architecture ↗` affordances remain, and no collection
panel gains a promoted row for it, per [[DEC-108]]):

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
