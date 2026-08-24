---
id: WO-075
type: work-order
title: "Brownfield import: seed a veri/ knowledge base from an existing project"
status: in-progress
created: 2026-08-24
updated: 2026-08-24
links:
  - id: REQ-024
    rel: implements
  - id: SRC-039
    rel: designed-by
  - id: REQ-008
    rel: constrained-by
  - id: REQ-013
    rel: extends
  - id: REQ-003
    rel: depends-on
  - id: DEC-002
    rel: constrained-by
---

## Summary

Give existing projects a guided on-ramp: an agent-assisted import pass that mines an existing repo — code layout, git history, ADRs, READMEs, CLAUDE.md/AGENTS.md — and produces *proposed* requirements and decisions (plus source documents for provenance) in a fresh or sparse veri/ directory. Everything lands non-binding (status: draft / proposed) per the REQ-008 approval workflow; the user reviews and stamps what survives. This removes the cold-start cost that currently makes Veri easiest to adopt only on greenfield projects.

## In scope

- A defined import flow reachable from both the CLI (`veri init` on a non-empty repo, or a dedicated subcommand) and the desktop app's new/open-project path
- An import work order / instruction package handed to the connected agent over MCP telling it what to mine and how to file findings (existing file_decision plus a way to file draft requirements and imported sources)
- Filing surface for the agent: draft requirements and imported SRC documents with provenance (file paths, commit refs) — extending the MCP toolset if needed
- A review experience: imported documents are clearly grouped/labeled as import output awaiting approval, and `veri check` keeps them non-binding until stamped
- Docs: a website page covering the brownfield path end to end

## Out of scope

- Any built-in LLM calls or network access from Veri itself (DEC-002 local-first; the user's own agent does the reading)
- Automatic approval or bulk-stamping of imported documents — promotion stays with the user
- Importing from external trackers (Jira, Linear, GitHub Issues)
- Migration of other ADR tool formats beyond reading plain markdown ADRs as sources

## Requirements

- [[REQ-024]] — implements
- [[REQ-008]] — constrained-by
- [[REQ-013]] — extends
- [[REQ-003]] — depends-on
- [[DEC-002]] — constrained-by

## Acceptance tests

- [x] Running the import flow on a repo with no veri/ directory produces a valid knowledge base where every generated requirement is status: draft and every generated decision is status: proposed
- [x] Imported documents carry provenance links to SRC documents naming the files/commits they were derived from
- [x] `veri check` passes on the imported tree and still blocks any work order from going in-progress against unapproved imported documents
- [ ] The desktop app surfaces the imported, unapproved documents as a reviewable group (implemented and unit-tested; live app walk pending)
- [x] The website documents the brownfield path from install to first stamped approval

## Receipts

- 2026-08-24 — 41b7a85 — packages/core/src/brownfield.ts, packages/mcp/src/writeback.ts, packages/mcp/src/server.ts, packages/cli/src/commands.ts, packages/ui/src/renderer/views/import.ts, packages/ui/src/renderer/views/home.ts, packages/ui/src/renderer/views/review.ts, packages/ui/src/renderer/derive.ts, packages/ui/src/lib/snapshot.ts, site/docs/brownfield.html, README.md — Implemented the full brownfield import loop per SRC-039: MCP filing surface + instruction package (DEC-067/068 proposed), veri import CLI, app Import view and review grouping, website guide; 530 tests green, live-app walk of the review surfaces still pending.
