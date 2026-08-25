---
id: DEC-098
type: decision
title: "Document creation deepens behind a createDocument options seam; MCP filers become composers"
status: active
approved: 2026-08-25
created: 2026-08-25
updated: 2026-08-25
links:
  - id: WO-102
    rel: constrains
  - id: DEC-037
    rel: relates-to
---

## Choice

Core's `createDocument` becomes the one implementation of document creation for every surface, gaining an options object `{date?, body?, links?}`: `body` overrides the type's template body, `links` are validated against the loaded project before anything is written and rendered into frontmatter, and `date` replaces the old positional fourth parameter. The type subdirectory is created if missing. The four MCP filing functions (fileDecision, fileWorkOrder, fileRequirement, fileSource) keep their per-type wire schemas — those are the LLM-facing authoring affordance — but their implementations reduce to composing markdown sections from the structured params and making one createDocument call. Section composition (## Choice, ## Summary, the ## Receipts placeholder) stays in the MCP surface as a wire-shape concern; file mechanics (id allocation via the shared idstore, frontmatter canon including the commented binds: block on work orders, slug, wx-write, id recording) live only in core. This closes the WO-088 divergence where MCP-filed work orders lack the binds: affordance that veri new and the app emit, and gives the WO-100 amend tool a deeper seam to land on.

## Rejected alternatives

- **Move per-type section composition into core too (core-level fileDecision/fileWorkOrder shapes)** — rejected: core's creation contract is "type + title (+ body/links) in, a check-passing file out" (REQ-009). The mapping from structured tool params to markdown sections is the filing surface's wire concern; pushing it into core widens core's interface for one caller's convenience.
- **Keep the filers and just export shared helpers (slugify, frontmatter assembler) from core** — rejected: that shares lines, not the seam. The next frontmatter-canon change (WO-088 was exactly this) would still require editing five call sites, and nothing stops them drifting again.
- **A union fourth parameter `date: string | CreateOptions` for signature back-compat** — rejected: only core's own tests pass the positional date; @verikb/* is at 0.x where a clean minor-version signature beats a permanent union. One options object is the durable public interface.
- **Validate links in the MCP layer and pass them through unvalidated** — rejected: createDocument already loads the project for id allocation, so validation there is free, atomic with the write, and available to every future caller (the app's create flow, WO-100's amend path) instead of being re-implemented per surface.

## Rationale

Same deepening class as DEC-091 (one check derivation) and DEC-092 (one pending/prompts definition): four hand-kept mirrors of creation mechanics have already produced a live divergence — agent-filed work orders, the majority of filings, silently lack the binding block that the drift detectors (WO-088, REQ-021) depend on being offered at creation time. Collapsing onto createDocument makes the frontmatter canon single-homed, deletes roughly 150 duplicated lines, and means the next creation-canon change lands everywhere at once. Sequencing matters: WO-100 (amend) is ready for dispatch and touches the same file; landing this first means amend is built against the deep seam rather than a fifth copy.
