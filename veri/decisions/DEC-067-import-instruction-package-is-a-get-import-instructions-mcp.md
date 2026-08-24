---
id: DEC-067
type: decision
title: "Import instruction package is a get_import_instructions MCP tool; one kickoff prompt in core"
status: active
approved: 2026-08-24
created: 2026-08-24
updated: 2026-08-24
links:
  - id: WO-075
    rel: constrains
  - id: REQ-024
    rel: implements
  - id: DEC-002
    rel: consistent-with
---

## Choice

The brownfield import instruction package (REQ-024) is served by a new MCP tool, `get_import_instructions`: it assembles, per call, what to mine, the filing rules and link relations, a census of documents already in the knowledge base (so re-runs file only what is not covered), and the project's document templates. The user-facing kickoff prompt — the short text the app's "Copy import kickoff" button copies and `veri import` prints — is one canonical string exported from @veri/core, and it simply tells the agent to call `get_import_instructions` and follow it. CLI, app, and MCP all share these two sources; there is no third copy of the instructions anywhere.

## Rejected alternatives

- **Embed the full instructions in the copied kickoff prompt** — duplicates the package into every paste, goes stale in the user's scrollback, and cannot include a live census of existing documents at the moment the agent starts.
- **A special section in the workflow document (WF-001) read via get_document** — makes every project's scaffolded workflow carry import instructions it may never use, and per-project copies drift as the app updates; the instructions are app behavior, not project canon.
- **Reuse get_context with a pseudo work order** — get_context is defined over work orders and their neighborhoods (REQ-003); overloading it with a non-document id breaks its contract and its consumers.

## Rationale

The instructions must be served over MCP (REQ-024 acceptance) and must be current at call time — both the census and the filing rules version with the installed app, not with the project. Splitting pointer (core, static) from package (MCP, assembled) keeps the paste small, the instructions fresh, and follows the existing pattern where creation logic lives in one shared place (WO-022).
