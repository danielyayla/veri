---
id: WO-019
type: work-order
title: veri open — launch the desktop app from the CLI
status: done
created: 2026-08-11
updated: 2026-08-11
links:
  - id: REQ-002
    rel: extends
  - id: WO-002
    rel: extends
  - id: WO-005
    rel: depends-on
  - id: DEC-008
    rel: constrained-by
---

## Goal

Opening the desktop app currently requires knowing the incantation
(`cd packages/ui && npm run build && npm start`). Add a `veri open`
subcommand to `@veri/cli` that launches the Electron UI for the current
project directory, detached from the terminal.

## In scope

- `veri open [dir]`: resolve the target project directory (default:
  cwd), locate the `@veri/ui` entry point, and spawn Electron detached
  so the command returns and the app outlives the terminal.
- A clear error when the UI package or Electron binary can't be found
  (e.g. CLI installed standalone without the desktop app).
- If the app should open the given project rather than its own MRU
  default, pass the directory through the existing project-open path.
- `veri --help` lists the new subcommand; tests for argument handling
  and the not-found error path.

## Out of scope

- Any change to the UI itself (no new IPC surface beyond what
  project-open already has).
- Packaging/distribution of the Electron app (installers, `veri`
  bundling the UI binary).
- Windows/Linux-specific launcher polish beyond what `spawn` with
  `detached` gives for free.

## Acceptance tests

- [x] `veri open` from a project root launches the UI on that project
      and returns to the shell prompt immediately.
- [x] `veri open` where the UI package is unavailable prints an
      actionable error and exits non-zero.
- [x] `veri check` and `npm test` are clean.

## Receipts

- 2026-08-11 — fe70767 — packages/cli/src/cli.ts, packages/cli/src/commands.ts, packages/cli/src/commands.test.ts — veri open subcommand: resolves the project dir, launches @veri/ui via its electron binary detached, with actionable errors for missing project or unbuilt/absent UI.
