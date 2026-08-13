---
id: DEC-024
type: decision
title: Templates ship as a context-package tail section
status: proposed
created: 2026-08-13
updated: 2026-08-13
links:
  - id: WO-023
    rel: constrains
  - id: REQ-010
    rel: follows-from
  - id: DEC-023
    rel: follows-from
  - id: DEC-006
    rel: extends
---

## Choice

`get_context` closes every package with a `## Templates` section: all
five types' effective bodies, each marked `project template` or
`built-in default`, read fresh from `veri/templates/` at assembly
time. The section adds tokens but not docCount — templates are not
documents ([[DEC-023]]). No new MCP tool.

## Rejected alternatives

- **A dedicated `get_template` tool** — a second surface agents must
  know to call; [[REQ-010]]'s criterion reads "context packages
  expose the project's templates", and an optional tool is exactly
  the kind of guidance agents skip. Can still be added later if
  packages ever need trimming.
- **Only the decision template** (the type agents most often file
  mid-work-order) — saves ~200 tokens but breaks the criterion for
  requirements and work orders drafted during planning conversations.
- **Templates in the workflow document** — would mean duplicating
  template content into WF-001 and letting it drift from the files,
  the exact three-places problem [[REQ-006]] exists to end.

## Rationale

All five bodies together cost roughly 300 tokens on a ~12k-token
package — trivial next to the failure mode they prevent: an agent
inventing its own document structure mid-task. Putting them in the
package follows [[DEC-006]]'s pattern of assembly rules owned by the
package itself, and the tail position keeps the binding material
(workflow, work order, requirements, decisions) in front.
