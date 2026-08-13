---
id: REQ-007
type: requirement
title: Agent handoff — kickoff prompt and agent-agnostic session start
status: accepted
approved: 2026-08-10
created: 2026-08-08
updated: 2026-08-13
links:
  - id: SRC-003
    rel: designed-by
  - id: REQ-003
    rel: depends-on
  - id: REQ-004
    rel: depends-on
  - id: REQ-005
    rel: depends-on
  - id: DEC-002
    rel: constrained-by
  - id: DEC-012
    rel: constrained-by
---

## Purpose

The work-order screen assembles a context package but leaves the last
mile to the user: they must open an agent themselves and know to ask it
to fetch context over MCP. The current "Serve via MCP" button only
reveals a snippet, which users read as an action that hands the work
order to an agent. This requirement closes that gap in a
provider-neutral way.

Veri's MCP server is already agent-agnostic — MCP is an open standard
and any compliant client (Claude Code, Cursor, Codex CLI, Gemini CLI,
…) can call `veri.get_context`. What is provider-specific is only the
plumbing: where each client reads its MCP configuration and how a
session is launched with an initial prompt.

## Acceptance criteria

1. **Copy Kickoff Prompt.** From a work order, one click copies a
   short, agent-neutral prompt (e.g. "Implement WO-008. Fetch the
   context package with the veri MCP tool `get_context(\"WO-008\")`
   before writing code."). Works with any agent, including web chat
   UIs, with no configuration.
2. **Start Agent Session.** From a work order, the user picks an agent
   from a list of *detected* local agents and Veri launches a session
   in that agent with the kickoff prompt, in the project directory.
3. **Agent adapter registry.** Supported agents are described by a
   small declarative adapter: display name, how to detect it (binary
   on PATH), its MCP config location/format for this project, and its
   launch command template. Adding a provider means adding an adapter,
   not new UI.
4. **Connection-aware.** If the chosen agent's MCP config lacks the
   veri entry, offer to write it first (extending the REQ-005 panel's
   logic beyond `.mcp.json`/Claude Code) or fall back to Copy Kickoff
   Prompt with an explanation.
5. **Honest states.** Agents that cannot be launched with a prompt +
   local MCP server (e.g. web-only chat apps) never appear as
   launchable; the UI steers those users to Copy Kickoff Prompt.

## Out of scope

- Any network calls or hosted-agent APIs (v1 constraint).
- Monitoring or controlling the agent session after launch.
- Guaranteeing the agent actually calls `get_context`.
