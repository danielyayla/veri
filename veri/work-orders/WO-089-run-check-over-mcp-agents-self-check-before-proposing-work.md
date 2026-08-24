---
id: WO-089
type: work-order
title: "run_check over MCP — agents self-check before proposing work"
status: backlog
created: 2026-08-24
updated: 2026-08-24
links:
  - id: REQ-003
    rel: extends
  - id: REQ-021
    rel: related
  - id: DEC-025
    rel: constrained-by
  - id: DEC-040
    rel: constrained-by
  - id: WO-088
    rel: builds-on
  - id: SRC-043
    rel: derived-from
---

## Summary

Expose `veri check` over the MCP server as a `run_check` tool returning structured findings, so an MCP-connected agent can verify the knowledge base — and, once WO-088 lands, its own code changes — before filing documents or declaring work done. Today the MCP surface is read-and-write but cannot check: agents in this repo shell out to the CLI, and MCP-only agents in other harnesses have no check at all (SRC-043). The tool must be the same core check path the CLI runs — never a reimplementation — mirroring REQ-025's rule that no surface adds checking logic of its own.

## In scope

- A `run_check` MCP tool returning the same violations and advisories core computes for `veri check`, as structured output (kind, document id, file, message, tier), plus an overall pass/fail matching the CLI's exit semantics
- Pure document checks (schema, links, gates, approval stamps) always run; git-backed checks (provenance, drift) run only when the host posture allows facts collection, and otherwise report as skipped-with-note in the result — the same degradation REQ-021 requires outside a git repository, never a silent omission
- A decision filed during implementation on how git facts reach the MCP server, honoring the mcp module's subprocess-free posture (WF-001): either the git-backed tier is out of reach over MCP and says so, or a host adapter supplies facts without the server spawning processes — the choice and its rejected alternatives go through the DEC flow
- Workflow/agent-facing documentation: the kickoff guidance tells agents to run_check before filing receipts or declaring done
- End-to-end proof from Claude Code against this repo's own veri/ directory, consistent with REQ-003's existing acceptance pattern

## Out of scope

- Any checking logic implemented in the MCP layer itself — the tool wraps core's existing check and drift functions only
- Write or fix-up behavior (auto-repairing findings) — run_check reads and reports
- Scope filtering beyond what core check already supports; a scoped/partial check is future work if a real agent workflow demands it
- The bindings detectors themselves (WO-088); this tool surfaces whatever core computes at the time it runs

## Requirements

- [[REQ-003]] — extends
- [[REQ-021]] — related
- [[DEC-025]] — constrained-by
- [[DEC-040]] — constrained-by
- [[WO-088]] — builds-on
- [[SRC-043]] — derived-from

## Acceptance tests

- [ ] `run_check` returns every violation and advisory the CLI's `veri check` reports for the same tree, with machine-readable kind, document id, and tier — verified by a test comparing the two surfaces on a fixture corpus
- [ ] The result distinguishes violations (would fail the CLI) from advisories (inform only), matching DEC-025 semantics
- [ ] When git-backed checks cannot run under the server's posture, the result names them as skipped with a reason — they never vanish silently
- [ ] The MCP server spawns no subprocesses, or a proposed decision records the deliberate relaxation with rejected alternatives
- [ ] The tool works end-to-end from Claude Code against this repository's own veri/ directory
- [ ] Agent-facing documentation instructs running run_check before filing a receipt or reporting completion

## Receipts

(none yet)
