---
id: WO-129
type: work-order
title: "The front door opens on a bare repo: an init path over MCP"
status: in-progress
claimed_by: opus-wo129
claimed_at: 2026-08-27
approved: 2026-08-27
created: 2026-08-27
updated: 2026-08-27
links:
  - id: REQ-041
    rel: implements
  - id: DEC-125
    rel: constrained-by
  - id: REQ-008
    rel: constrained-by
  - id: DEC-007
    rel: constrained-by
  - id: SRC-061
    rel: derived-from
# binds:         # code this work order claims (optional)
#   paths: []    # repo-root-relative globs
#   tests: []    # test files proving it (path or path::name)
---

## Summary

A single MCP tool that scaffolds a knowledge base into a repo that has none ([[REQ-041]] item 5), so the skill library can be Veri's front door ([[DEC-125]]) rather than something that only works on projects which already ran `veri init`.

The implementation is thin because the scaffold already exists and is already shared: `scaffoldProject(root, opts)` in `packages/core/src/scaffold.ts` is the one scaffold implementation, called today by both `veri init` and the desktop app's New-project flow so the trees they produce are identical by construction (WO-018). This work order gives it an MCP door and no second implementation.

Two facts checked before planning, both favourable. The server does not need a knowledge base to boot: `projectRoot` is resolved from `process.argv[2]` at startup, and `guardFormat()` runs per tool rather than at load, so a bare repo reaches the tool list. And a missing `veri/` classifies as `pre-marker`, which `isOperableFormat` accepts — so the existing guard passes on a bare repo and needs no change. The new tool must simply not call `loadProject`, which is what actually fails with "no veri/ directory here".

**One question this work order does not settle.** [[REQ-041]]'s criterion says the init path must never run without the user being asked first, and there is no obvious mechanical enforcement: an agent can satisfy a `confirmed: true` parameter on its own, MCP elicitation is unevenly implemented across hosts, and host-level tool approval is real but not guaranteed. Per [[WF-001]] rule 4 the implementer files this as a proposed decision with the alternatives rejected, rather than picking one silently — it touches the same user-in-control boundary [[REQ-008]] and [[DEC-111]] rest on, and is the reason this work order is small enough to stop and think in.

## In scope

- An `init_project` MCP tool taking an optional path relative to the server's `projectRoot` (defaulting to the root itself), returning the created `veri/` directory, the document count, and the root-level files written and skipped — the fields `ScaffoldResult` already models
- Reuse of `scaffoldProject` from `@verikb/core`; no second scaffold implementation, no re-derivation of what an empty project contains
- `ProjectExistsError` surfaced as a clear refusal naming the directory, never an overwrite — the existing "an existing `veri/` is never touched" guarantee carried through to the MCP surface intact
- Registration in `packages/mcp/src/server.ts` with a strict schema that refuses unknown keys, per the lesson recorded in DEC-118
- A proposed decision recording how the user's consent is obtained before the tool writes, with the alternatives rejected (see the summary — this is expected work, not a deviation)
- Colocated tests: scaffolding into an empty directory, refusal when `veri/` already exists, the returned shape, and that the tool is reachable on a bare repo where `loadProject` would fail

## Out of scope

- **Demo and starter bundles over MCP.** They ship inside `@verikb/cli` per DEC-007, and `@verikb/mcp` depends only on `@modelcontextprotocol/sdk`, `@verikb/core`, and `zod`. Reaching them would mean a new package dependency, which is a decision rather than a detail of this work — file it if wanted, do not take it here
- Migration of an existing `veri/` to the current format — `veri migrate` owns that
- Brownfield import, which has its own path (`veri import` and the kickoff prompt)
- The harness shell emitter, the method documents, and anything else in [[DEC-125]]'s scaffolding story beyond the knowledge base itself
- [[REQ-041]] items 1–4: [[WO-127]] and [[WO-128]] cover the first three, and relay approval is still an open decision on [[SRC-061]]'s frontier
- Changing `guardFormat` or the server's startup contract — both were checked and need no change

## Requirements

- [[REQ-041]] — implements
- [[DEC-125]] — constrained-by
- [[REQ-008]] — constrained-by
- [[DEC-007]] — constrained-by
- [[SRC-061]] — derived-from

## Acceptance tests

- [ ] `init_project` on a directory with no `veri/` creates one, returns the `veriDir`, `docCount`, `filesWritten` and `filesSkipped` that `scaffoldProject` reports, and the result passes `veri check` with zero issues
- [ ] `init_project` on a directory that already holds a `veri/` refuses with a message naming the directory, and no file on disk is modified
- [ ] The tool is registered with a strict schema that rejects unknown keys
- [ ] The tool is callable on a bare repo — a test proves it succeeds where a `loadProject`-backed tool reports "no veri/ directory here"
- [ ] No scaffold logic is duplicated: the only call path to project creation in `packages/mcp` is `scaffoldProject` from core
- [ ] A proposed decision exists recording how user consent is obtained before the tool writes, with rejected alternatives

## Receipts

(none yet)
