---
id: WO-016
type: work-order
title: Approval gate core — schema, check rules, proposal-only writeback
status: done
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

- [x] `file_decision` cannot produce a non-`proposed` decision.
- [x] `veri check` flags an in-progress WO depending on a pending doc,
      and passes the same WO in `backlog`.
- [x] `veri check` flags `active`/`accepted` without `approved`.
- [x] Context package for a WO citing a pending doc shows it only in
      the labeled pending block.
- [x] `veri approve` performs the exact stamp-and-flip edit and refuses
      on documents with check issues.
- [x] Migration commit landed; `npm test` and `veri check` clean.

## Receipts

- 2026-08-10 — fa0dada + 25baf52 — packages/core (schema, types, parse, check, approve, index, tests+fixtures), packages/mcp (writeback, server, context, tests+fixtures), packages/cli (commands, cli, templates, tests+fixtures), veri/ corpus stamps, CLAUDE.md, REQ-003, DEC-015 — approval gate shipped: proposed status, approved: stamps, gated-wo + missing-approval checks, proposal-only file_decision, pending block in context assembly, veri approve; 69/69 core+mcp+cli tests, veri check clean.
