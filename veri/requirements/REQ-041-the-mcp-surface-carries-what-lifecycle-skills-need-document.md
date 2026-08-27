---
id: REQ-041
type: requirement
title: "The MCP surface carries what lifecycle skills need: document listing, queue introspection, structured receipts, relay approval"
status: accepted
approved: 2026-08-27
created: 2026-08-27
updated: 2026-08-27
links:
  - id: SRC-060
    rel: derived-from
  - id: REQ-040
    rel: refines
  - id: REQ-008
    rel: constrained-by
  - id: DEC-125
    rel: constrained-by
---

The skill library design ([[SRC-060]]) exposes four recurring gaps in the MCP surface. For skills ([[REQ-040]]) to operate without shelling out to the CLI or parsing prose, the server must carry:

1. **Document listing** — query documents by type, status, and staleness (e.g. `list_documents({type?, status?, updated_before?})`), so wayfinding, approval passes, and health sweeps can enumerate the review queue and the decayed tail instead of relying on ranked search.
2. **Queue introspection** — the `veri next` view over MCP: ready work orders in dispatch order, plus current claims (`claimed_by`/`claimed_at`), so a session can orient before starting work.
3. **Structured receipts** — receipt entries (date, commit SHA, files, summary) exposed as data, not only as markdown prose, so health, review, and archaeology can correlate the record with git history.
4. **Relay approval** — an approval path that requires an explicit per-document user verdict, keeping the stamp human ([[REQ-008]]) while letting an approval-session skill run the mechanics. This is the one item with a real design question (what constitutes a verdict token over MCP) and may warrant its own decision before implementation.
5. **Knowledge-base scaffolding** — an `init` path over MCP, so a skill meeting a repo with no `veri/` directory can create one after asking, rather than duplicating `packages/core/src/scaffold.ts` or shelling out to the CLI. The skill library is Veri's front door ([[DEC-125]]), so the first thing a new user's first skill invocation needs is the ability to bring the knowledge base into being; without this the front door only opens on projects that already ran `veri init`.

Items 1–3 and 5 are read-only or scaffold-only additions with no promotion-boundary risk. Item 4 touches the boundary itself and must not ship without a decision recording how the user's act stays the user's.

## Acceptance criteria

- [ ] `list_documents` (or equivalent) filters by type, status, and an updated-before cutoff, and returns id/title/status/updated for each hit
- [ ] A queue query returns ready work orders in the same order `veri next` would print, with claims included
- [ ] Receipts are retrievable as structured entries carrying their commit SHAs
- [ ] An `init` path over MCP scaffolds a knowledge base into a repo that has none, reusing core's scaffold rather than a second implementation, and never runs without the user being asked first
- [ ] Relay approval, if implemented, is gated by a decision (proposed → active) that defines the explicit per-document user verdict and is refused without one
