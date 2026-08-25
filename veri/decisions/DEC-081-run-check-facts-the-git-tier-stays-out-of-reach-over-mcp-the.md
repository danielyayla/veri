---
id: DEC-081
type: decision
title: "run_check facts — the git tier stays out of reach over MCP; the report derivation moves to core"
status: active
approved: 2026-08-25
created: 2026-08-24
updated: 2026-08-25
links:
  - id: WO-089
    rel: constrains
  - id: DEC-040
    rel: follows-from
  - id: DEC-037
    rel: follows-from
  - id: DEC-060
    rel: follows-from
  - id: REQ-021
    rel: satisfies
  - id: REQ-025
    rel: satisfies
---

## Choice

Two commitments, one mechanism. First, the health-check derivation the CLI's `checkReport` owned moves into core as `buildCheckReport(load, hostFacts)` (packages/core/src/report.ts): the CLI, the GitHub Action, and the MCP server's new `run_check` tool all call it, so no surface can reimplement or drift from another (REQ-025's rule, WO-089's "never a reimplementation" bar). Hosts supply only facts (DEC-040): git history, bound-test existence, observed imports.

Second, over MCP the git-backed tier (provenance, drift, binding drift) is out of reach and says so: the server keeps its subprocess-free posture (WF-001's module registry, the DEC-037 ruling) and passes `git: unavailable` with a reason naming the posture, so run_check reports those checks as skipped — never silently omitted (REQ-021). Everything filesystem-answerable runs: pure document checks, bound-test facts, and observed-import facts, collected by the server's own fs-only adapters (packages/mcp/src/facts.ts) that mirror the CLI's — each host owns its collectors per DEC-040, and a parity test (packages/mcp/src/check.test.ts) runs both surfaces over one corpus so the mirrors cannot drift apart silently.

## Rejected alternatives

- **Relax the subprocess ban so the MCP server shells out to git for run_check** — buys full parity in git repos, but reverses a posture two standing documents record (DEC-037's "deliberately pure", WF-001's module purpose "subprocess-free") for a gap the agent can close by running `veri check` in a terminal it already has; a posture change of that size is the user's call, not an implementation detail.
- **The MCP server imports the CLI's collectors** — zero duplication, but surfaces never couple sideways (DEC-060); the agent door would drag the terminal surface into its dependency graph.
- **Move the fact collectors into core** — one copy for all hosts, but core deliberately never collects facts (DEC-040 rejected exactly this for git; WO-088 kept test facts host-side), and it would put source-tree scanning in the package whose whole contract is purity over inputs.
- **The calling agent supplies git facts as run_check input** — no subprocess and full parity on paper, but the check would trust the checked party's account of history: unverifiable, enormous payloads, and an obvious way to hand the checker a flattering corpus.
- **Leave the report assembly in the CLI and have the MCP server re-orchestrate core's check functions** — works today, drifts tomorrow; WO-089 exists because REQ-025 forbids per-surface checking logic, and orchestration order and skip-note wording are checking logic.

## Rationale

The derivation moving to core is what makes the posture question small: once every surface shares one report function, "what can run_check see" reduces to "what facts can this host collect", and the honest answer for a subprocess-free stdio server is everything on disk and nothing in git history. Skipped-with-reason keeps the degradation REQ-021 already requires outside a git repository — the MCP posture is just another host where facts are unavailable, and the parity test pins both surfaces to identical output whenever their facts match. If the git tier over MCP later proves worth having, that is a one-decision change (supersede this one) with no restructuring: the report function already accepts git facts from any host willing to collect them.
