# Veri

Veri keeps a project's requirements, decisions, and work orders as linked
markdown files, and hands a coding agent a complete context package for any
task over MCP.

This repo is self-hosted: Veri is built by executing Veri work orders.

## How to work in this repo

1. Never start coding from a chat prompt alone. Find the relevant work order
   in `veri/work-orders/`. If none exists, say so and propose one.
2. Before implementing a work order, read every document it links to
   (requirements, decisions) in full. Respect linked decisions — if you
   believe a decision is wrong, stop and say so instead of silently
   deviating.
3. Stay inside the work order's "In scope" section. Anything in
   "Out of scope" is forbidden, even if it seems easy or obvious.
4. When you make a non-trivial technical choice during implementation
   (library selection, algorithm, schema shape), file it as a new decision
   in `veri/decisions/` using the next free DEC id, status `active`,
   with the alternatives you rejected.
5. When you finish a work session on a work order, append a receipt to the
   work order file under `## Receipts`: date, commit SHA, files touched,
   one-line summary. A work order is `done` only when all acceptance
   criteria are checked AND at least one receipt exists.
6. Run `veri check` (once WO-002 is done) before declaring any work
   complete. Zero issues is the bar.

## Document format

Every document in `veri/` is markdown with YAML frontmatter:

```yaml
---
id: REQ-001            # stable, never reused, never renamed
type: requirement      # requirement | decision | work-order | source
title: Short title
status: draft          # see per-type statuses below
created: 2026-08-06
updated: 2026-08-06
links:
  - id: DEC-001
    rel: constrained-by   # free-text but keep it short and consistent
---
```

Statuses:
- requirement: draft → accepted → retired
- decision: active → superseded (add `superseded_by: DEC-XXX`)
- work-order: backlog → in-progress → done
- source: imported

Cross-references inside body text use `[[ID]]` wiki-link syntax.
IDs are `REQ-`, `DEC-`, `WO-`, `SRC-` + zero-padded 3-digit number.

## Code conventions

- TypeScript, strict mode, Node >= 20, ESM only.
- Monorepo: `packages/core` (parsing, graph, context assembly),
  `packages/cli`, `packages/mcp`.
- Core has zero runtime dependencies beyond `yaml` and `zod`.
  No database. Files are the source of truth (see DEC-002).
- Tests colocated as `*.test.ts`, run with `node --test` via `npm test`.
- No network calls anywhere in v1.
