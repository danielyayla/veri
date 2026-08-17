---
id: WO-030
type: work-order
title: First-run onboarding and agent connection verification
status: done
created: 2026-08-17
updated: 2026-08-17
links:
  - id: SRC-013
    rel: designed-by
  - id: REQ-013
    rel: implements
  - id: REQ-004
    rel: extends
  - id: REQ-005
    rel: extends
  - id: SRC-012
    rel: informed-by
  - id: DEC-011
    rel: constrained-by
  - id: DEC-007
    rel: constrained-by
  - id: DEC-012
    rel: constrained-by
---

## Summary

A fresh install currently drops a projectless user into a bare
picker, empty states are undesigned, and a written agent config can
be silently broken (no Node runtime, stale path) with no way to
tell from inside Veri. Deliver the guided first run: a designed
path from empty app to open project (new project or the bundled
sample per [[DEC-007]]), teaching empty states on the primary
surfaces, a connection check that proves the MCP server actually
serves the open project, and explicit handling of the Node >= 20
dependency that [[DEC-011]]-shaped configs assume.

## In scope

- First-launch path: with no known projects, offer create-new or
  open-bundled-sample instead of the bare MRU/folder-picker
  fallback.
- Designed empty states for home view, sidebar, and the connection
  panel in a project with no documents.
- A verification affordance in the connection panel: launches the
  configured server against the open project and reports
  success or a named cause (missing runtime, bad path, wrong
  project root).
- The Node-runtime decision, filed as a proposed DEC with rejected
  alternatives: remove the dependency (e.g. the config targets a
  runtime the app ships, which changes the recognized entry shape
  [[DEC-011]] gates) or detect-and-guide at connection time.
  Includes a spike to confirm the preferred mechanism works when
  the agent, not Veri, spawns the server.
- Verify configs written by version N resolve to a working server
  after self-update to N+1; fix the config shape if they do not.
- Design gate: all new surfaces here are renderer UI, so produce
  the design artifact and link it `designed-by` before
  implementation starts ([[DEC-012]]).

## Out of scope

- Website and written documentation ([[WO-029]]).
- Changes to the update pipeline itself ([[WO-028]]).
- Onboarding for Windows/Linux.
- Multi-project or team onboarding flows.
- Guided tours, tooltips-on-rails, or checklists beyond the
  designed empty states.

## Requirements

Implements [[REQ-013]] — first-run onboarding and agent connection
verification. Extends [[REQ-004]] (desktop UI) and [[REQ-005]]
(connection panel).

## Acceptance tests

- [x] On a machine with no prior projects, first launch reaches an
      open project (new or sample) with no external docs consulted
- [x] Home view, sidebar, and connection panel each render a
      designed empty state in a documentless project
- [x] The connection check succeeds against a healthy config and
      names the cause for: missing Node runtime, nonexistent server
      path, wrong project root
- [x] Connecting on a machine without a usable Node runtime
      produces guidance at connection time, not a silent agent-time
      failure
- [x] A config written before a self-update resolves to a working
      server after the update
- [x] Node-runtime mechanism filed as a proposed DEC with rejected
      alternatives; design artifact linked `designed-by` before any
      renderer code
- [x] `veri check` and `npm test` are clean

## Receipts

- 2026-08-17 — fd19976 — veri/decisions/DEC-031, veri/sources/SRC-013, design/first-run-onboarding/README.md, design/first-run-onboarding/first-run-onboarding.html, veri/work-orders/WO-030 — claude-code session: pre-implementation package — ELECTRON_RUN_AS_NODE spike (full MCP session, embedded Node v22.22.0; login-shell probe evidence; update-survival path analysis), DEC-031 filed proposed (detect-and-guide, configs keep command "node"), design bundle for welcome screen / empty states / LIVE CHECK filed as SRC-013 and linked designed-by; WO stays backlog pending Daniel's DEC-012 design approval before renderer code
- 2026-08-17 — 6eee20f — ["packages/ui/src/lib/noderuntime.ts", "packages/ui/src/lib/verify.ts", "packages/ui/src/lib/noderuntime.test.ts", "packages/ui/src/lib/verify.test.ts", "packages/ui/src/renderer/views/welcome.ts", "packages/ui/src/renderer/views/mcp.ts", "packages/ui/src/renderer/views/home.ts", "packages/ui/src/renderer/app.ts", "packages/ui/src/renderer/api.ts", "packages/ui/src/main.ts", "packages/ui/src/preload.mts", "packages/ui/renderer/styles.css", "veri/work-orders/WO-030-first-run-onboarding-and-connection-verification.md"] — claude-code session: implementation after Daniel approved SRC-013 and DEC-031 (2026-08-17). All three designed surfaces: welcome screen replaces the cold-start picker loop (create / sample-with-demo-pre-enabled / open, inline not-a-project notice); empty states (home START HERE card, sidebar ghost hint rows incl. collapsed-by-default sources); LIVE CHECK (login-shell probe per DEC-031, real MCP handshake with snapshot-doc search proof, five named failure causes with one action each, passive runtime pre-check in the not-set-up hero). Verified visually via the screenshot harness — live check ran end-to-end against the real server (node v22.5.1, 92 documents, 4 tools). Update-survival box grounded in the DEC-031 spike (version-independent packaged server path, in-place .app replacement). 242 tests pass across the workspace (12 new), veri check clean; WO flipped to done.
