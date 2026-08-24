---
id: DEC-074
type: decision
title: "Apache-2.0 for the whole repository"
status: active
approved: 2026-08-24
created: 2026-08-24
updated: 2026-08-24
links:
  - id: WO-078
    rel: constrains
  - id: SRC-040
    rel: informed-by
---

## Choice

The entire repository — core, CLI, MCP server, action, desktop app, site, and the veri/ corpus — is licensed under Apache-2.0, with a single LICENSE file at the root and a `license: "Apache-2.0"` field in every package.json. Copyright holder: Daniel Kapper.

## Rejected alternatives

- **MIT** — equally permissive and more familiar, but no explicit patent grant; for infrastructure aimed at corporate adoption the Apache-2.0 grant removes a real hesitation at no adoption cost.
- **Split model (open core + source-available app)** — preserves a future commercial option for the desktop app (e.g. FSL/BUSL) but adds licensing complexity, weakens the local-first trust pitch, and GitHub renders "License: unknown/mixed" — the opposite of the polish this decision serves. Can be revisited before any commercial offering exists.

## Rationale

Chosen by Daniel in-session (2026-08-24) closing the licensing gap in [[SRC-040]]. Apache-2.0 is permissive enough for maximal adoption of the format and action, and its explicit patent grant matters for agent-tooling infrastructure that companies will embed in CI and development workflows. One license for the whole repo keeps the story simple for users, contributors, and GitHub's license detection.
