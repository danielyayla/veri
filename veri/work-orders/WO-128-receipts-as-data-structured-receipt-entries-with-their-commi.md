---
id: WO-128
type: work-order
title: "Receipts as data: structured receipt entries with their commit SHAs over MCP"
status: done
claimed_by: opus-wo128
claimed_at: 2026-08-27
approved: 2026-08-27
created: 2026-08-27
updated: 2026-08-27
links:
  - id: REQ-041
    rel: implements
  - id: DEC-081
    rel: constrained-by
# binds:         # code this work order claims (optional)
#   paths: []    # repo-root-relative globs
#   tests: []    # test files proving it (path or path::name)
---

## Summary

Exposes receipts as structured entries rather than prose ([[REQ-041]] item 3), so a health sweep, a spec-fidelity review, or an archaeology walk can correlate the record with git history without re-parsing markdown. The parser already exists and is exported: `parseReceipts` in `packages/core/src/provenance.ts` returns `ParsedReceipt[]` and backs the existing receipt-verification advisories. This work order gives it an MCP door.

## In scope

- A `get_receipts` MCP tool taking an optional work-order id: with one, that work order's receipts; without, every work order's receipts keyed by id
- Each entry carries what `ParsedReceipt` already models — date, commit SHA, files touched, summary — plus the work-order id it belongs to
- Reuse of `parseReceipts` from core; no second receipt parser
- Registration in `packages/mcp/src/server.ts` with a strict schema
- Colocated tests: a work order with several receipts, one with none, an unknown id, and the corpus-wide form

## Out of scope

- Changing the receipt markdown format or the `## Receipts` convention
- Running git or verifying that the SHAs exist — the MCP server spawns no subprocesses (DEC-081); verification stays the terminal `veri check` tier
- Writing receipts; `file_receipt` already owns that
- The enumeration tools, which are their own work order

## Requirements

- [[REQ-041]] — implements
- [[DEC-081]] — constrained-by

## Acceptance tests

- [x] `get_receipts({id: 'WO-126'})` returns that work order's receipts with date, SHA, files, and summary
- [x] `get_receipts()` returns receipts for every work order that has them, and omits those that have none
- [x] An unknown or non-work-order id returns an empty result, not an error
- [x] The tool spawns no subprocess and performs no git access
- [x] `veri check` passes with zero violations

## Receipts

- 2026-08-27 — 1b3f5b3 — packages/mcp/src/receipts.ts,
  packages/mcp/src/receipts.test.ts, packages/mcp/src/server.ts,
  packages/mcp/src/server.e2e.test.ts, packages/core/src/provenance.ts,
  packages/core/src/provenance.test.ts, action/dist/index.js,
  veri/decisions/DEC-132-one-receipt-parser-core-s-parsereceipts-gains-the-date-and-s.md
  — get_receipts lands as one MCP read module over core's parseReceipts,
  which now returns the date and summary it was already splitting and
  discarding; strict schema, DEC-131's line shape, SHAs reported as filed
  with no git anywhere; 10 colocated tests plus wire coverage, 826 tests
  green across the monorepo, check 0 issues and no new advisories, and
  DEC-132 files the shape choices as a proposal.
