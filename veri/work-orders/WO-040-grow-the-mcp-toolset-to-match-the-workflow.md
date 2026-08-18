---
id: WO-040
type: work-order
title: Grow the MCP toolset to match the workflow
status: in-progress
created: 2026-08-18
updated: 2026-08-18
links:
  - id: REQ-017
    rel: implements
---

## Summary

WF-001 binds every agent session to obligations the MCP toolset cannot
discharge: "read every linked document in full" (no way to fetch a
document outside the package), "propose a work order" (no tool writes
one), and graph traversal (search returns one metadata line per hit).
Close the gap from the tool side: add `get_document`, a neighbors read,
and a work-order proposal path, keeping the write surface as narrow and
auditable as `file_decision` is today.

## In scope

- A `get_document` tool: any document id in, full body and frontmatter
  out.
- A neighbors tool: a document's outbound links and backlinks, each with
  its `rel`, without assembling a package.
- A `file_work_order` (or equivalent) tool that creates a work order via
  the shared core creation path; it is born `backlog` and therefore
  gate-safe by construction (DEC-022), and it consumes an id through the
  shared allocator (DEC-037).
- An audit pass over the scaffolded WF-001 text and every tool
  description: each workflow obligation maps to a tool, and each
  description states only what the tool does.
- Tests in the MCP package for all three tools, including the
  born-unapproved property.

## Out of scope

- Any tool that promotes a document, changes a status past the gate, or
  edits an existing document body — explicitly prohibited by REQ-017.
- Changes to context-package assembly (that is [[WO-041]]; the retrieval
  tools built here are what it depends on).
- UI changes.

## Requirements

Implements [[REQ-017]] — what the agent can do and what the workflow
demands must be the same set.

## Acceptance tests

- [ ] An agent can dereference any id it encounters and receive the full
      body.
- [ ] An agent can ask for any document's graph neighborhood (outbound
      and backlinks, with rels).
- [ ] An agent-filed work order is born `backlog`, unapproved, with a
      permanently consumed id.
- [ ] Every obligation in the scaffolded WF-001 maps to a tool that can
      discharge it; tool descriptions promise nothing the build does not
      provide.
- [ ] No write path can approve, promote, or edit an existing body;
      tests assert the refusals. Full suite and `veri check` clean.

## Receipts

(none yet)
