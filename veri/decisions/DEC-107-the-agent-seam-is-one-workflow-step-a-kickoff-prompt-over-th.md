---
id: DEC-107
type: decision
title: "The agent seam is one workflow step — a kickoff prompt over the CLI surface, the agent CLI swapped in place"
status: active
approved: 2026-08-25
created: 2026-08-25
updated: 2026-08-25
links:
  - id: WO-101
    rel: constrains
  - id: REQ-007
    rel: consistent-with
  - id: DEC-106
    rel: extends
  - id: DEC-101
    rel: builds-on
  - id: DEC-097
    rel: builds-on
---

## Choice

Everything provider-specific in the dispatcher lives in a single marked step, "Run the agent". Its contract is minimal: a CLI with a non-interactive mode receives the kickoff prompt and can read files, run commands, and commit. The recipe shows one concrete invocation — Claude Code headless (`claude -p`) — and swapping agents means changing the install line and the invocation, nothing else.

The kickoff prompt reuses [[REQ-007]]'s agent-neutral handoff shape — name the work order, point at the context package, restate scope-and-receipt rules — but points at `veri context <id>` on the shell rather than the MCP `get_context` tool, so any agent that can run a command self-briefs with zero MCP configuration. The claim is written by the recipe itself (`veri start <id> --as dispatcher-run-<run_id>`) before the agent starts: the dispatcher owns the transition, the agent owns the work, and the claim exists even if the agent dies at its first token.

## Rejected alternatives

- **Requiring MCP wiring in CI** — each agent CLI reads MCP config from a different place; that per-provider plumbing is exactly what [[REQ-007]] isolates, and in CI the shell is the one surface every agent already has.
- **Embedding the full context package in the prompt** — duplicates what `veri context` serves, goes stale the moment the agent edits documents mid-session, and bloats every dispatch; a fetch instruction keeps the package fresh and the prompt small.
- **Porting REQ-007's adapter registry into the recipe** — a declarative matrix of agents in workflow YAML is app-domain machinery; a recipe teaches by one worked example plus a marked seam.
- **Letting the agent claim its own work order** — an agent that crashes at startup would leave a dispatched, unclaimed branch; the transition belongs to the dispatcher so the claim's existence never depends on the agent's health.
- **Calling a hosted agent API directly (`curl`)** — bakes one vendor's HTTP shape into the recipe; agent CLIs are the abstraction that already exists and the one users run locally.

## Rationale

[[REQ-007]]'s premise — agents differ only in plumbing, never in what Veri hands them — applies doubly in CI, where the lowest common denominator is a shell in a checkout. Confining the vendor to one step makes "swap the agent" a two-line diff and keeps the rest of the recipe (poll, claim, gate, PR) provider-free, which is what lets one documented recipe serve every headless CLI.
