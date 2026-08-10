---
id: REQ-003
type: requirement
title: MCP server assembles and serves context packages
status: accepted
approved: 2026-08-10
created: 2026-08-06
updated: 2026-08-06
links:
  - id: REQ-001
    rel: depends-on
  - id: DEC-003
    rel: constrained-by
---

A local MCP server gives any MCP-capable coding agent read/write access to
the knowledge base. The core operation is the context package: given a work
order ID, return everything an agent needs to implement it correctly.

Package rules: linked requirements and decisions in full; sources as
excerpts; project conventions (CLAUDE.md if present) always included;
superseded decisions excluded but named, so the agent knows what was
already rejected.

## Acceptance criteria

- [ ] `get_context(id)` returns the work order, all transitively linked
      requirements and active decisions (2 hops max), package rules
      applied, with a per-document and total token estimate
- [ ] `search(query)` returns matching documents by ID, title, and body
      text with type and status
- [ ] `file_decision(...)` creates a valid decision document with the next
      free DEC id and `status: proposed` (pending user approval per
      [[REQ-008]]), and returns its ID
- [ ] `file_receipt(work_order_id, ...)` appends a receipt (date, commit,
      files, summary) to the work order's Receipts section per [[DEC-003]]
- [ ] All four tools work end-to-end from Claude Code against this repo's
      own `veri/` directory
