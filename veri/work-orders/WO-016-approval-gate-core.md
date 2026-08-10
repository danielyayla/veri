---
id: WO-016
type: work-order
title: Approval gate core — schema, check rules, proposal-only writeback
status: backlog
created: 2026-08-10
updated: 2026-08-10
links:
  - id: REQ-008
    rel: implements
  - id: DEC-002
    rel: constrained-by
---

## Goal

Implement the non-UI mechanics of [[REQ-008]]: the `proposed` status and
`approved` stamp in the schema, the two new check rules, proposal-only
MCP writeback, the labeled pending block in context assembly, and a
`veri approve` CLI command.

## In scope

- `packages/core/src/schema.ts`: decision status enum gains `proposed`;
  optional `approved` date field on decisions and requirements;
  superRefine — `active` decision / `accepted` requirement requires
  `approved`.
- `packages/core/src/check.ts`: new checks wired into `checkProject` —
  (a) in-progress/done work order with a direct frontmatter link to a
  `draft` requirement or `proposed` decision; (b) promoted document
  missing its `approved` stamp.
- `packages/mcp/src/writeback.ts`: `file_decision` writes
  `status: proposed`, never `approved`; tool description and return
  text say a proposal was filed pending review and that the agent
  should present it (what it commits to, rules out, rejected).
- `packages/mcp/src/context.ts`: pending documents render in a
  "Pending proposals — not ratified, do not treat as binding" block
  instead of the binding sections.
- `packages/cli`: `veri approve <ID>` — flips status, stamps today's
  date, refuses if the document has check issues.
- Migration: one commit stamping the existing `active`/`accepted`
  corpus with `approved:` dates (Daniel reviews the diff — this is the
  one-time ratification of the pre-gate documents).
- Colocated `*.test.ts` coverage for every rule above.

## Out of scope

- All UI ([[WO-017]]).
- Git-hook enforcement of human-only promotion.
- Any change to requirement/work-order status enums.

## Acceptance criteria

- [ ] `file_decision` cannot produce a non-`proposed` decision.
- [ ] `veri check` flags an in-progress WO depending on a pending doc,
      and passes the same WO in `backlog`.
- [ ] `veri check` flags `active`/`accepted` without `approved`.
- [ ] Context package for a WO citing a pending doc shows it only in
      the labeled pending block.
- [ ] `veri approve` performs the exact stamp-and-flip edit and refuses
      on documents with check issues.
- [ ] Migration commit landed; `npm test` and `veri check` clean.

## Receipts
