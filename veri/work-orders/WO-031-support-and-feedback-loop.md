---
id: WO-031
type: work-order
title: Support and feedback loop
status: in-progress
created: 2026-08-17
updated: 2026-08-17
links:
  - id: REQ-014
    rel: implements
  - id: SRC-012
    rel: informed-by
  - id: DEC-002
    rel: constrained-by
  - id: SRC-011
    rel: designed-by
---

## Summary

Veri ships no telemetry, so user reports are the only field signal —
and today there is no channel, no in-app path to it, and no log to
attach. Deliver the minimum loop: a GitHub issue template capturing
app and macOS version, a native "Report an Issue" menu item that
opens a prefilled issue, and main-process/updater logging to a
known local path so silent failures (update checks fail silently by
design, [[REQ-011]]) are diagnosable from a log the user attaches
themselves.

## In scope

- GitHub issue template(s) in the repo: bug report requesting
  reproduction steps, app version, macOS version, and the log
  file; a lighter feedback/idea template.
- A native application-menu item (Help menu) that opens the
  browser to a prefilled new-issue URL with app version and OS
  version included. Native menu only — no renderer UI — so the
  design gate is satisfied with a [[DEC-026]]-style note-style
  source linked `designed-by`, as [[WO-027]]/[[WO-028]] did.
- Main-process and updater logging to a documented local file
  location; library choice (electron-log or hand-rolled) filed as
  a proposed DEC. Logged: app lifecycle, update-check outcomes
  including failures, MCP-config writes. Never logged: document
  bodies or any knowledge-base content.
- A log-rotation or size cap so the log cannot grow unbounded.
- The no-telemetry stance and log location handed to [[WO-029]]
  for the troubleshooting page (or added there directly if
  [[WO-029]] has shipped).

## Out of scope

- Telemetry, crash reporting, or any automatic transmission of
  logs or diagnostics ([[DEC-002]] stance; [[WO-028]] reaffirmed).
- Auto-attaching the log file to the prefilled issue.
- Renderer UI for support (feedback forms, in-app log viewer).
- Community channels (forum, Discord) and support SLAs.
- Capturing renderer console output or MCP server request logs.

## Requirements

Implements [[REQ-014]] — support and feedback loop.

## Acceptance tests

- [ ] Help-menu action opens a new GitHub issue prefilled with app
      version and macOS version in one step
- [ ] The repository presents the issue template to anyone filing
      manually; it requests repro steps and the log file
- [x] A failed update check (offline launch) is absent from the
      UI but present in the log at the documented path
- [x] The log contains no document bodies or knowledge-base
      content after a session of normal editing
- [x] The log respects its rotation/size cap
- [x] Logging library choice filed as a proposed DEC; note-style
      design source linked `designed-by`
- [x] `veri check` and `npm test` are clean

## Receipts

(none yet)
