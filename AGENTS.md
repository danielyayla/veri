# Veri

Veri keeps a project's requirements, decisions, and work orders as linked
markdown files, and hands a coding agent a complete context package for any
task over MCP.

This repo is self-hosted: Veri is built by executing Veri work orders.

## How to work in this repo

The workflow is a first-class document: `veri/workflow.md` (WF-001,
per DEC-018). It arrives as the first section of every context
package — read it and follow it. In short: work order first, read
every linked document, stay in scope, file choices as proposed
decisions, append receipts, `veri check` before done.

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
- decision: proposed → active → superseded (add `superseded_by: DEC-XXX`)
- work-order: backlog → in-progress → done
- source: imported

Promotion (draft → accepted, proposed → active) requires an
`approved: YYYY-MM-DD` frontmatter stamp and belongs to the user alone
(`veri approve <id>`). `veri check` enforces both the stamp and the gate:
a work order may not be in-progress/done while it links to an unapproved
document — draft/proposed documents are visible in context packages but
never binding (REQ-008).

Cross-references inside body text use `[[ID]]` wiki-link syntax.
IDs are `REQ-`, `DEC-`, `WO-`, `SRC-` + a number of three or more digits
(zero-padded to three below 1000, unpadded above).

## Code conventions

- TypeScript, strict mode, Node >= 20, ESM only.
- Monorepo: `packages/core` (parsing, graph, context assembly),
  `packages/cli`, `packages/mcp`, `packages/ui` (Electron desktop app,
  see DEC-008).
- Core has zero runtime dependencies beyond `yaml` and `zod`.
  No database. Files are the source of truth (see DEC-002).
- Tests colocated as `*.test.ts`, run with `node --test` via `npm test`.
- No network calls anywhere in v1.
