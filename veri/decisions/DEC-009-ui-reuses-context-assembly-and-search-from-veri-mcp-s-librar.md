---
id: DEC-009
type: decision
title: "UI reuses context assembly and search from @veri/mcp's library exports"
status: active
created: 2026-08-07
updated: 2026-08-07
links:
  - id: WO-005
    rel: constrains
  - id: DEC-006
    rel: follows-from
---

## Choice

`packages/ui` imports `assembleContext` (and `searchDocs`) from `@veri/mcp`, whose package entry exports these as plain library functions without starting the MCP server. The Context Package panel derives its doc list, ordering, and token figures by parsing the exact markdown `assembleContext` returns, so the panel can never drift from what `get_context` serves an agent.

## Rejected alternatives

- **Move `assembleContext` into `@veri/core`** — matches WO-005's "core for all … context assembly" wording literally, but refactors a shipped package outside WO-005's scope, and the assembly rules (source excerpts, conventions inclusion, superseded handling) were decided as MCP behavior in DEC-006; the MCP package is their natural home until a third consumer appears.
- **Reimplement assembly in the UI** — forbidden outright by WO-005 ("no logic duplicated in the frontend") and by REQ-004's acceptance criterion that the panel show exactly what `get_context` returns; two implementations would inevitably drift.
- **Spawn the real MCP server as a subprocess and call `get_context` over stdio** — maximal fidelity in theory, but same code path as importing the function, with process management, serialization, and startup latency for zero behavioral difference.

## Rationale

Identity, not similarity: importing the one true implementation is the only design under which "panel matches get_context" holds by construction. `@veri/mcp`'s index exports carry no MCP SDK runtime cost into the renderer path (the server binary is a separate entry), so the dependency is cheap and truthful.
