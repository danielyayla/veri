---
id: DEC-103
type: decision
title: "MCP amendment is one dedicated tool — whole-document revise, born-pending statuses only"
status: proposed
created: 2026-08-25
updated: 2026-08-25
links:
  - id: WO-100
    rel: constrains
  - id: REQ-008
    rel: constrained-by
  - id: DEC-076
    rel: follows-from
---

## Choice

The iterate half of the triage loop ships as a single dedicated MCP tool, `amend_document`, addressing a document by id with three optional replacement fields: `title`, `body` (the complete markdown body below the frontmatter), and `links` (the full frontmatter links list). At least one field is required. Eligibility is the born-pending status per type — `draft` requirements, `proposed` decisions, `backlog` work orders; everything else (approved/active/accepted, `ready` and started work orders, sources, workflows) is refused with an error naming the REQ-008 approval boundary. The tool accepts no status, approval, or date fields, and the write lands through core's guarded save (`saveDocumentFile`), so id immutability, the untouchable `approved:` stamp, the no-promotion rule, and the DEC-076 `updated:` bump are enforced by the same seam the app's direct editing uses. A replacement body may not contain a `## Receipts` section — the on-disk section is carried over verbatim, keeping receipts append-only via `file_receipt`. The result is re-parsed before writing; a revision that would fail `veri check` structurally is refused, nothing written.

## Rejected alternatives

- **Upsert mode on each `file_*` tool** (`file_work_order` with an optional `id`) — blurs the born-pending invariant the create tools state in one word (a create is always pending; an amend must prove the target still is), doubles every tool description's contract, and makes the dangerous path (touching an existing document) the same call as the safe one.
- **Per-section patch grammar** (`sections: [{heading, content}]`) — a partial-update DSL to specify, validate, and teach agents, for no capacity gain: the caller amending after review feedback has the whole revised document in hand anyway, and whole-body replace plus the receipts carry-over is one rule instead of a merge algorithm.
- **Raw file write over MCP** (a generic `write_file`) — bypasses schema validation, link checking, and the approval guards entirely; exactly the fallback WO-100 exists to remove.
- **Amending sources** — imported evidence is preserved verbatim (DEC-094's posture); a "revised" source is new evidence, filed as a new document.

## Rationale

Propose → review → revise should ride the same validated path as propose (WO-100). A dedicated tool keeps create and amend as separately auditable acts with separately worded contracts, which is what the approval boundary needs: creation is always safe (born pending), amendment is conditionally safe (pending targets only), and the tool shape itself encodes that no call can promote, stamp, or touch reviewed canon. Reusing `guardDocumentEdit`/`saveDocumentFile` keeps the boundary's enforcement in one home, per the guards-live-in-core discipline, instead of a second MCP-side implementation that could drift.
