---
id: WO-007
type: work-order
title: Agent connection panel — MCP setup screen in the desktop UI
status: done
created: 2026-08-07
updated: 2026-08-13
links:
  - id: REQ-005
    rel: delivers
  - id: SRC-002
    rel: informed-by
  - id: DEC-002
    rel: constrained-by
  - id: DEC-008
    rel: constrained-by
  - id: DEC-009
    rel: constrained-by
  - id: WO-005
    rel: depends-on
  - id: WO-003
    rel: depends-on
---

## Summary

Build the Agent connection screen per [[REQ-005]], recreating the
Claude Design handoff in [[SRC-002]]
(`design/agent-connection-handoff/README.md` + `agent-connection.html`)
at high fidelity inside the `packages/ui` shell built by [[WO-005]].
The panel manages only the project-scoped `.mcp.json` next to the open
project's `veri/` directory; it never shows or implies live client-side
connection status.

## In scope

- Main-process logic (packages/ui lib): derive the four health checks
  from disk (`.mcp.json` exists, veri entry present, server executable
  found, project root matches), one-click setup write, targeted repairs
  that rewrite only the `mcpServers.veri` entry, conflict detection for
  unrecognized veri entries, and a file watcher for external edits —
  with colocated tests
- The screen itself: all five designed states (not set up, healthy,
  broken, externally modified, conflicting entry), restart and
  external-edit banners, always-present "prefer user-scoped setup?"
  (copy-only `claude mcp add` command) and "what the connection
  provides" sections — exact tokens and copy per the handoff spec
- Entry points: sidebar-footer status row (config state only: not set
  up / configured / needs attention) and the `connection settings →`
  link in the work-order context panel
- Re-run checks action; checks re-derived from disk on open, after
  every write, and on watch events (never cached as app state)

## Out of scope

- Live client connection status of any kind
- Editing or displaying non-Veri servers in `.mcp.json` (they are
  preserved untouched)
- Running `claude mcp add`, running builds, or restarting agent apps
  on the user's behalf (explain + copy commands only)
- Network calls
- Restyling or refactoring existing screens beyond the two entry points

## Requirements

Delivers [[REQ-005]] — the agent connection panel.

## Acceptance tests

- [x] Fresh project: "Set up connection" writes a correct `.mcp.json`
      (server path + project root of the directory containing `veri/`)
      with no typed input, then shows healthy state + restart banner
- [x] All five states render per the handoff spec, switchable by
      on-disk reality
- [x] Each failing check names the problem in plain language with
      exactly one corrective action; repairs rewrite only the veri
      entry and preserve all other servers byte-for-byte semantically
- [x] External edits to `.mcp.json` while the panel is open re-run
      checks without restart and show the info banner
- [x] Unrecognized `veri` entries surface the conflict card and are
      never silently overwritten
- [x] Sidebar footer row reflects config state and navigates to the
      panel; work-order panel links to it
- [x] No live connection status shown or implied; `npm test`,
      typecheck, and `veri check` pass clean

## Receipts

- 2026-08-07 · fdcf713 · packages/ui/src/lib/mcpconfig.ts(+test),
  packages/ui/src/{main.ts,preload.mts},
  packages/ui/src/renderer/{api.ts,app.ts,views/mcp.ts,views/workorder.ts},
  packages/ui/renderer/styles.css, veri/{REQ-005,SRC-002,DEC-011,WO-007} ·
  Built the agent connection panel end to end; all five states verified by
  screenshot against the SRC-002 prototype, one-click setup / fix-path /
  external-edit re-check exercised against real files, 72 tests + veri
  check clean.
