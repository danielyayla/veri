---
id: REQ-005
type: requirement
title: MCP connection panel — no-code agent setup per project
status: accepted
approved: 2026-08-10
created: 2026-08-07
updated: 2026-08-07
links:
  - id: SRC-002
    rel: designed-by
  - id: REQ-003
    rel: depends-on
  - id: REQ-004
    rel: depends-on
  - id: DEC-002
    rel: constrained-by
  - id: DEC-008
    rel: constrained-by
  - id: DEC-010
    rel: informed-by
---

## Purpose

Connecting an agent to a Veri project currently requires hand-editing
`.mcp.json` or running a CLI command. This requirement adds a screen to
the desktop UI so a user can set up, verify, and repair the MCP
connection for the currently open project without writing any
configuration by hand.

Target user: a Veri user who wants their coding agent fed context
packages but has never edited an MCP config. Success means: open
project → one click → restart their agent app → tools available.

## What the panel manages (and what it doesn't)

The panel manages only the **server side** of the connection: the
project-scoped `.mcp.json` file that tells agent clients (Claude Code
and compatible apps) how to launch the Veri MCP server. It does not and
cannot manage the client side — live connection state, session
restarts, or the client's own MCP settings. The design must not imply
otherwise (no "connected/disconnected" live status; the honest states
are listed below).

Per [[DEC-002]], the config the panel writes is a plain `.mcp.json`
file next to the project's `veri/` directory — user-readable,
diffable, checked into the repo. The panel holds no state of its own.

## Functional requirements

1. **Entry point.** Reachable from the project scope of the existing
   UI (Claude Design chooses where: topbar, settings, or a callout —
   see states below for when it should be prominent).
2. **One-click setup.** A primary action that writes a correct
   `.mcp.json` for the open project: correct server path, project root
   argument pointing at the directory *containing* `veri/`. No fields
   the user must fill in for the happy path.
3. **Health check.** On open (and after any repair), the panel
   evaluates and displays:
   - `.mcp.json` present / absent
   - server entry present in it / missing
   - referenced server executable exists / not found (e.g. not built,
     or repo moved)
   - project-root argument matches the open project / points elsewhere
4. **Repair.** Each failing check has a single corrective action
   (e.g. "Fix path"), which rewrites only the Veri entry in
   `.mcp.json`, preserving any other servers the user has configured.
5. **Per-user alternative.** A copyable, pre-filled
   `claude mcp add …` command for users who prefer user-scoped setup
   over a checked-in file. Copy is the only action; the app never runs
   it.
6. **Restart notice.** After any write, the panel tells the user their
   agent session must be restarted for changes to take effect — the
   one step the app cannot do for them.
7. **What-is-this explainer.** A short inline explanation of what the
   connection provides (the four tools: get_context, search,
   file_decision, file_receipt) for users who don't know what MCP is.

## States the design must cover

- **Not set up** — no `.mcp.json` or no Veri entry. The panel's main
  state; setup action prominent.
- **Configured and healthy** — all checks pass. Calm confirmation;
  show the effective config (server path, project root) read-only.
- **Configured but broken** — one or more checks fail (moved project,
  unbuilt server, foreign machine paths from a teammate's commit).
  Show which check failed in plain language and the one-click repair.
- **Externally modified** — `.mcp.json` edited outside the app while
  the panel is open; re-run checks and reflect reality (files are the
  source of truth).
- **Conflicting entry** — `.mcp.json` has a `veri` server entry the
  panel didn't write / doesn't recognize. Show it; offer to replace
  it; never silently overwrite.

## Out of scope

- Any live client-side status (whether an agent is currently
  connected, tool call activity)
- Managing MCP servers other than Veri's (other entries in
  `.mcp.json` are preserved untouched, not displayed for editing)
- Running `claude mcp add` or restarting agent apps on the user's
  behalf
- Building the server from the panel (a failed "executable exists"
  check may explain the build step, not perform arbitrary builds)
- Network calls of any kind

## Acceptance criteria

- [ ] A user on a fresh project reaches a working `.mcp.json` from the
      panel with a single action and no typed input
- [ ] All five states above have designed treatments
- [ ] Every failing health check names the problem in plain language
      and offers exactly one corrective action
- [ ] Non-Veri entries in an existing `.mcp.json` are never modified
      or lost
- [ ] External edits to `.mcp.json` are reflected without restart
- [ ] No live connection status is shown or implied
