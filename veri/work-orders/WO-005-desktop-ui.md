---
id: WO-005
type: work-order
title: Desktop UI — five screens over the knowledge base
status: done
created: 2026-08-07
updated: 2026-08-13
links:
  - id: REQ-004
    rel: delivers
  - id: SRC-001
    rel: designed-by
  - id: DEC-002
    rel: constrained-by
  - id: DEC-008
    rel: constrained-by
  - id: WO-001
    rel: depends-on
  - id: WO-003
    rel: depends-on
---

## Summary

Build the Veri desktop UI per [[REQ-004]], recreating the design reference
in [[SRC-001]] (`design/design-mockup.html` + `design/README.md`) at high
fidelity. The UI is a new `packages/ui` consuming `packages/core` for all
parsing, graph traversal, and context assembly — no logic duplicated in
the frontend.

## In scope

- Framework/shell selection for a local desktop app (file it as a new DEC
  with rejected alternatives before writing code)
- The five screens and three cross-cutting behaviors in [[REQ-004]]
- Read/write against a `veri/` directory via `packages/core`; watch for
  external file changes
- Context Package panel backed by the same assembly code as `get_context`
- The design's exact visual system (tokens and measurements are specified
  in `design/README.md`)

## Out of scope

- Editing raw markdown source in the UI beyond frontmatter fields, status,
  and appended notes (full editor is a later WO)
- Multi-project workspaces, tabs, or window management
- Any network feature, telemetry, or auto-update
- Mobile or web deployment

## Requirements

All acceptance criteria of [[REQ-004]] verbatim.

## Acceptance tests

- [x] Open this repo's own `veri/` directory: all five screens render its
      real documents correctly
- [x] Change a WO status on the board, run `veri check` → zero issues; the
      file diff shows only the status + updated fields
- [x] The Context Package panel for a WO matches `get_context` output for
      the same ID (doc list and ordering identical)
- [x] Break a link in a file externally → the health chip and the doc's
      indicator appear without restart
- [x] `[[` autocomplete in the note field inserts a link that resolves in
      the Connections panel immediately

## Receipts

- 2026-08-07 — d060025 — design/, packages/ui (main, preload, lib, renderer, tests, fonts), veri/requirements/REQ-004, veri/decisions/DEC-008 + DEC-009, veri/sources/SRC-001, CLAUDE.md, package.json — claude-code agent session: integrated the design handoff and built the Electron desktop UI — five screens over live veri/ files, file watching, veri-check surfacing, [[ autocomplete, Context Package panel identical to get_context; all five acceptance tests verified via headless screenshots, 60 tests green
- 2026-08-07 — 11e9895 — packages/ui/src/main.ts, packages/ui/src/lib/root.ts, packages/ui/src/lib/root.test.ts — claude-code agent session: bare `npm start -w @veri/ui` now works — project root resolved by walking up from cwd to the nearest veri/ directory (explicit argument still wins); 3 new tests
