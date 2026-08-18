---
id: REQ-017
type: requirement
title: Agent parity with the workflow it is handed
status: draft
created: 2026-08-18
updated: 2026-08-18
links:
  - id: SRC-016
    rel: informed-by
  - id: REQ-003
    rel: extends
  - id: REQ-008
    rel: constrained-by
---

The workflow document is handed to every agent as binding method, but the
MCP toolset cannot perform what [[WF-001]] demands. WF-001 tells an agent
with no work order to "say so and propose one" — no tool can create a work
order. It tells agents to read every linked document in full — but an agent
cannot read any document outside the assembled package (no `get_document`),
cannot traverse the graph (no neighbors/backlinks read), and `search`
returns one metadata line per hit with no body. [[SRC-016]] finding 3: the
agent is handed a workflow bigger than its tools.

What the agent can do and what the workflow demands must be the same set.
Either the tools grow to match WF-001, or WF-001 shrinks to match the
tools — a standing mismatch is the one prohibited state.

The write surface stays narrow and auditable: new write paths produce only
unapproved documents, exactly as `file_decision` does today ([[REQ-008]]).

## Acceptance criteria

- [ ] An agent can dereference any document id it encounters and receive
      the full body (e.g. a `get_document` tool).
- [ ] An agent can ask for a document's graph neighborhood — outbound
      links and backlinks with their `rel` — without assembling a package.
- [ ] An agent can propose a work order; it is born `backlog` and is
      therefore gate-safe by construction ([[DEC-022]]).
- [ ] Every workflow obligation in the scaffolded WF-001 maps to a tool
      that can discharge it, and every tool description states only what
      the tool does.
- [ ] No new tool can promote a document, change a status past the gate,
      or edit an existing document body.
