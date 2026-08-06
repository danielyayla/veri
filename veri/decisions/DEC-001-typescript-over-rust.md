---
id: DEC-001
type: decision
title: TypeScript over Rust for v1
status: active
created: 2026-08-06
updated: 2026-08-06
links:
  - id: WO-001
    rel: constrains
---

## Choice

Build the v1 core, CLI, and MCP server in TypeScript (Node >= 20, ESM).

## Rejected alternatives

- **Rust** — better binary story and a future Tauri path, but slower
  iteration for a solo builder, and the official MCP TypeScript SDK is the
  most mature. Nothing in v1 is performance-bound: parsing a few hundred
  markdown files is trivial in any language.
- **Go** — good CLI ergonomics, but weakest MCP ecosystem of the three and
  no advantage over TS for this workload.

## Rationale

v1 optimizes for shipping speed and MCP maturity. The file format is the
contract, not the runtime — a future Rust rewrite (e.g. for a Tauri app)
reads the same `veri/` directory. Revisit if/when a desktop app is
scheduled.
