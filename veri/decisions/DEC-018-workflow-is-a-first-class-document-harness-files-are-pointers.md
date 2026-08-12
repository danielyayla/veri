---
id: DEC-018
type: decision
title: "The workflow is a first-class document; harness files are thin pointers"
status: active
approved: 2026-08-12
created: 2026-08-12
updated: 2026-08-12
links:
  - id: WO-021
    rel: constrains
  - id: DEC-002
    rel: follows-from
  - id: DEC-006
    rel: extends
  - id: REQ-003
    rel: extends
---

## Choice

The workflow — how a project moves from sources/evidence to
requirements and decisions, then to work orders, implementation, and
receipts — is a Veri document: `veri/workflow.md`, `type: workflow`,
with frontmatter, links, and statuses like every other document
(statuses `draft → accepted → retired`, promotion via `veri approve`
per [[REQ-008]]). Scaffolding writes an opinionated default so every
new project starts with a recommended method.

Context assembly includes the workflow as the first section of every
context package, replacing today's read of the project root's
`CLAUDE.md` in `packages/mcp/src/context.ts`. The context package
(MCP `get_context` / `veri context`) is the one harness-agnostic
delivery channel; any harness that can fetch a package gets the
workflow with no per-harness work.

Harness entry files (`AGENTS.md`, `CLAUDE.md`, editor rule files) are
generated, content-free pointers: "this project is managed with Veri;
fetch the context package for your work order before coding." The
scaffold emits `AGENTS.md` (the emerging cross-vendor convention) and
a `CLAUDE.md` that defers to it. Pointers carry no workflow content,
so there is nothing to keep in sync.

## Rejected alternatives

- **Keep the workflow in `CLAUDE.md`** (status quo) — couples the
  canonical method to one harness's filename, leaves it outside the
  document model (no id, no links, no approval gate, invisible to
  `veri check`), and forces other harnesses to either read a
  competitor-named file or duplicate it.
- **Template the workflow into each harness file at init** — solves
  agnosticism at the moment of scaffolding, but snapshots the text:
  the moment the user edits the canonical copy, N stale duplicates
  silently stop matching it.
- **A well-known untyped file** (`veri/workflow.md` with no
  frontmatter, special-cased by assembly) — smaller change, but the
  workflow would be the only method-bearing text exempt from Veri's
  own model. Veri's thesis is that method lives in the knowledge
  base; the workflow should be approvable, linkable, and checkable
  like everything else.
- **A new `veri/workflows/` subdirectory with multiple documents** —
  premature. One workflow per project is the opinionated default;
  plural workflows can be a later decision if a need appears.

## Rationale

The context package already is the portable, human-readable,
harness-neutral artifact ([[DEC-006]]); putting the workflow inside
the knowledge base ([[DEC-002]]: files are the source of truth) means
one canonical copy, pulled by every consumer rather than pushed to
each. Customization is free — it is a markdown file the user edits —
and the approval gate extends naturally to workflow changes.
