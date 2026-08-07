---
id: REQ-004
type: requirement
title: Desktop UI for browsing and editing the knowledge base
status: accepted
created: 2026-08-07
updated: 2026-08-07
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

Five screens, per the design reference in [[SRC-001]]:

1. **Project home** — three panes: doc tree grouped by type; markdown
   reader with frontmatter rendered as a properties header; Connections
   panel showing inbound + outbound links as grouped cards.
2. **Work order detail** — the six-section work order with linked
   requirements/decisions as expandable inline cards, a status control, a
   Context Package panel (doc list, per-doc + total token estimate, "Copy
   for agent" and "Serve via MCP"), and the receipt after completion.
3. **Board** — work orders as kanban (backlog / in progress / done); cards
   show ID, title, linked-REQ count, and an agent marker when receipts
   include an agent session.
4. **Graph** — a minimal link graph, nodes colored by type, detail popover
   on click. Navigation aid only.
5. **Decision log** — chronological decision feed with rejected
   alternatives as struck-through chips; superseded decisions dimmed with
   a pointer to their replacement.

Cross-cutting: typing `[[` in any editor opens ID/title autocomplete;
`veri check` issues surface as quiet indicators on affected docs and in a
topbar chip; agent write-backs (context pulls, filed decisions, receipts)
appear as an activity feed on each doc.

## Acceptance criteria

- [ ] Opening a Veri project directory renders all five screens against
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
