---
id: WO-002
type: work-order
title: CLI — init, new, check, list
status: done
created: 2026-08-06
updated: 2026-08-07
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

- [x] `veri init && veri new requirement "X" && veri check` succeeds in a
      temp directory end-to-end
- [x] `veri check` on a fixture with 5 known issue types reports exactly 5
      issues and exits 1
- [x] `veri check` on this repository exits 0

## Receipts

- 2026-08-06 — 25b47de — packages/cli (src + fixtures + tests),
  .github/workflows/ci.yml, core message refinement, DEC-005 — built the
  veri CLI (init, new, check, list) with bin wiring and CI; 30 tests
  green and `veri check` exits 0 on this repo
- 2026-08-06 — 9371906 — package.json (root), .github/workflows/ci.yml — fixed CI on fresh checkouts: typecheck now builds first since cross-package types resolve to @veri/core dist; also added workflow_dispatch
- 2026-08-07 — 2d62235 — package.json (root) — completed the CI fix: explicit core-first workspace build order (npm builds alphabetically); first green CI run on a fresh checkout
