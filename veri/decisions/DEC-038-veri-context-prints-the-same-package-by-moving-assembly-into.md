---
id: DEC-038
type: decision
title: "veri context prints the same package by moving assembly into core"
status: active
approved: 2026-08-18
created: 2026-08-18
updated: 2026-08-18
links:
  - id: WO-042
    rel: constrains
  - id: DEC-018
    rel: follows-from
---

## Choice

Implement `veri context <WO-id>` (rather than stripping it from scaffolded text) by moving context assembly — `assembleContext` and its token estimate — from `@veri/mcp` into `@veri/core`, next to the assembly policy and inline threshold that already live there. `@veri/mcp` re-exports it unchanged and the CLI imports it, so both channels — MCP `get_context` and the terminal — serve one byte-identical package from one implementation.

## Rejected alternatives

- **Strip `veri context` from scaffolded text instead** — [[DEC-018]] names it as the terminal delivery channel, and human/agent parity is a contract property: a human, or an agent without MCP, must be able to fetch the exact package from a terminal.
- **Make the CLI depend on `@veri/mcp`** — inverts the layering and drags the MCP SDK into every CLI install for one pure function.
- **Duplicate the assembly in the CLI** — two implementations drift, which is the exact failure [[REQ-019]] exists to prevent.

## Rationale

Assembly is knowledge-base logic, not transport; core is already where the CLI and the app share every other path (creation, approval, checking). With one implementation, "prints the same package get_context serves" is true by construction, not by discipline.
