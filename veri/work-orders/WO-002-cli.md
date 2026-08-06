---
id: WO-002
type: work-order
title: CLI — init, new, check, list
status: backlog
created: 2026-08-06
updated: 2026-08-06
links:
  - id: REQ-002
    rel: delivers
  - id: WO-001
    rel: depends-on
---

## Summary

Build `packages/cli` on top of core: the `veri` binary with `init`, `new`,
`check`, and `list`. After this ships, this repository enforces its own
rules (`veri check` in CI).

## In scope

- `veri init [--demo]` (demo content itself arrives in [[WO-004]]; wire
  the flag now, error politely until then)
- `veri new <type> "<title>"` with next-free-ID allocation and body
  templates per type (work orders get the six-section skeleton)
- `veri check` rendering core's structured issues; non-zero exit on any
- `veri list [type]`
- Publishable as `@veri/cli` exposing the `veri` bin; runnable via npx
- GitHub Actions workflow running tests + `veri check` on this repo

## Out of scope

- Any MCP functionality ([[WO-003]])
- Interactive prompts, TUI, colors beyond minimal status markers
- Editing or migrating existing documents

## Requirements

All acceptance criteria of [[REQ-002]] verbatim (see that file).

## Acceptance tests

- [ ] `veri init && veri new requirement "X" && veri check` succeeds in a
      temp directory end-to-end
- [ ] `veri check` on a fixture with 5 known issue types reports exactly 5
      issues and exits 1
- [ ] `veri check` on this repository exits 0

## Receipts

(none yet)
