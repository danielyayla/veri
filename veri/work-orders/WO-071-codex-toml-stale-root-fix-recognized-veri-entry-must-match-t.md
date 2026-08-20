---
id: WO-071
type: work-order
title: "Codex TOML stale-root fix — recognized veri entry must match the open project"
status: backlog
created: 2026-08-20
updated: 2026-08-20
links:
  - id: REQ-007
    rel: implements
  - id: SRC-003
    rel: designed-by
  - id: DEC-011
    rel: constrained-by
  - id: DEC-013
    rel: constrained-by
---

## Summary

Codex CLI's MCP config is user-global (`~/.codex/config.toml`), but the agent picker's status check (`tomlEntryStatus` in `packages/ui/src/lib/agents.ts`) accepts any recognized `[mcp_servers.veri]` block without comparing its project-root argument to the open project. A block written for project A therefore reports `connected` from project B, `connectAgent()` early-returns without updating it, and a launched Codex session serves the wrong project. This work order makes recognition root-aware: a recognized entry whose root argument does not resolve to the open project reports `not-connected`, and Set up & launch replaces Veri's own stale block in place (permitted by DEC-011 — the recognized shape is the ownership marker) instead of early-returning or appending a duplicate. The JSON status check gets the same root comparison for consistency (its write path already rewrites unconditionally). Foreign or unparseable configs remain conflicts, never touched.

## In scope

- `tomlEntryStatus` / `tomlSectionRecognized` in `packages/ui/src/lib/agents.ts`: extract the recognized block's args and report `connected` only when the root argument resolves to the open project; a recognized block with a different root is `not-connected`.
- `connectAgent()` TOML path: when a recognized-but-stale block exists, replace that block in place (all other file content preserved verbatim) rather than appending a second `[mcp_servers.veri]` section.
- `jsonEntryStatus` in the same file: apply the same root comparison (resolved against the project root, so relative-path entries like this repo's own `.mcp.json` still count as connected).
- Picker row copy for `not-connected` in `packages/ui/src/renderer/views/workorder.ts`: word it to cover both "no veri entry" and "entry points at another project" (e.g. "no veri entry for this project").
- Tests in `packages/ui/src/lib/agents.test.ts`: TOML stale-root detect + in-place replacement preserving other sections; JSON stale-root detect; relative-root JSON entry still `connected`.
- Update the user-global callout on `site/docs/connect-codex-cli.html` to describe the new behavior (Set up & launch re-points the block; no manual edit needed).

## Out of scope

- Any new `AgentStatus` value or new picker row state — the fix maps stale-root to the existing `not-connected` state (SRC-003's four row states are unchanged).
- Shipping a TOML parser — the regex-scoped gate from DEC-013 stays; only the recognized block is ever touched.
- Any change to conflict/unparseable handling — foreign entries remain surfaced, never modified (DEC-011).
- The project-scoped connection panel in `packages/ui/src/lib/mcpconfig.ts` (its `rootMatches` health check + Fix path repair already cover the JSON panel).

## Requirements

- [[REQ-007]] — implements
- [[SRC-003]] — designed-by
- [[DEC-011]] — constrained-by
- [[DEC-013]] — constrained-by

## Acceptance tests

- [ ] From a project whose root differs from the recognized TOML block's root argument, `detectAgents` reports Codex as `not-connected`, not `connected`.
- [ ] `connectAgent` on that config replaces the veri block in place: exactly one `[mcp_servers.veri]` section afterward, root argument updated, every other line of the file preserved verbatim.
- [ ] Re-detecting from the newly connected project reports `connected`; from the old project, `not-connected`.
- [ ] A recognized JSON entry whose root argument resolves elsewhere reports `not-connected`; a relative root that resolves to the project (e.g. `"."`) still reports `connected`.
- [ ] Foreign TOML/JSON veri entries still report `conflict` and are never written.
- [ ] The `site/docs/connect-codex-cli.html` callout describes the automatic re-point instead of the manual edit.
- [ ] `veri check` reports zero issues; the ui test suite passes.

## Receipts

(none yet)
