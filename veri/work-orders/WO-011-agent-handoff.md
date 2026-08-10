---
id: WO-011
type: work-order
title: Agent handoff — Copy Kickoff Prompt and Start Agent Session
status: done
created: 2026-08-08
updated: 2026-08-08
links:
  - id: REQ-007
    rel: delivers
  - id: SRC-003
    rel: designed-by
  - id: DEC-002
    rel: constrained-by
  - id: DEC-008
    rel: constrained-by
  - id: DEC-011
    rel: constrained-by
  - id: DEC-012
    rel: constrained-by
  - id: WO-005
    rel: depends-on
  - id: WO-007
    rel: depends-on
---

## Summary

Deliver [[REQ-007]]: replace the misleading "Serve via MCP" toggle on
the work-order screen with two real actions — **Copy Kickoff Prompt**
(agent-neutral text on the clipboard) and **Start Agent Session**
(pick a detected local agent, launch it in the project directory with
the kickoff prompt). Generalize the WO-007 connection logic from
"Claude Code's `.mcp.json`" to a per-agent adapter registry.

Per [[DEC-012]] this work order touches `packages/ui` and MUST link a
design document (`rel: designed-by`) before implementation. The design
must cover: the agent picker (detected vs. not-installed vs.
copy-only agents), the not-connected repair flow, and what replaces
the current "Serve via MCP" affordance.

## In scope

- `packages/ui` lib: agent adapter registry (Claude Code, Cursor,
  Codex CLI, Gemini CLI as the initial set) — detection via binary on
  PATH, MCP config read/write per adapter, launch command template.
- Extend `mcpconfig.ts` health/repair logic to operate per adapter
  while keeping the [[DEC-011]] recognized-entry gate for every config
  format written.
- Main process: IPC to detect agents, write config, and spawn the
  chosen agent's CLI in the project root (local process only, no
  network).
- Renderer: kickoff-prompt copy action; Start Agent Session picker;
  rename/remove the "Serve via MCP" toggle per the approved design.
- Kickoff prompt template shared by both actions.

## Out of scope

- Hosted or web-only agents beyond steering them to Copy Kickoff
  Prompt (no ChatGPT web integration, no APIs, no network calls).
- Session monitoring, streaming output, or receipts written on the
  agent's behalf.
- Changes to `packages/core`, `packages/cli`, or the MCP server —
  the server is already client-agnostic.

## Acceptance tests

- [x] A design document is linked `rel: designed-by` and was approved
      before any code landed.
- [x] Copy Kickoff Prompt places an agent-neutral prompt naming the
      work-order id and `get_context` on the clipboard.
- [x] Start Agent Session lists only agents actually detected on this
      machine; undetected adapters are shown as unavailable.
- [x] Launching an agent whose MCP config lacks the veri entry offers
      the config write first; declining falls back to copy-prompt.
- [x] Each adapter's config write passes the DEC-011 recognized-entry
      gate; a conflicting foreign entry is surfaced, never overwritten.
- [x] `veri check` reports zero issues.

## Receipts

- 2026-08-08 · 4672af9 · packages/ui/src/lib/agents.ts (+tests),
  mcpconfig.ts, main.ts, preload.mts, renderer/{api,app,derive}.ts,
  views/workorder.ts, renderer/styles.css, design/agent-handoff/ ·
  Adapter registry + picker + kickoff prompt per SRC-003; 79 tests pass,
  veri check clean, verified via screenshot harness.
- 2026-08-10 · 7f028d8 · packages/ui/renderer/styles.css · Fixed collapsed
  button heights in the column layout (flex-basis override); re-verified
  against the prototype via screenshot.
- 2026-08-10 · 78de2d9 · packages/ui/src/lib/agents.ts (+test), main.ts ·
  Startup sweep deletes launch scripts older than an hour from the temp
  dir; 7 adapter tests pass.
