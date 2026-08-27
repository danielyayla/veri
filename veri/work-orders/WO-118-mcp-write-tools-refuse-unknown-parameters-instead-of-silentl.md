---
id: WO-118
type: work-order
title: "MCP write tools refuse unknown parameters instead of silently dropping content"
status: done
approved: 2026-08-27
created: 2026-08-27
updated: 2026-08-27
links:
  - id: REQ-003
    rel: implements
# binds:         # code this work order claims (optional)
#   paths: []    # repo-root-relative globs
#   tests: []    # test files proving it (path or path::name)
---

## Summary

Filing DEC-112 (2026-08-26), an agent passed rejected_alternatives to file_decision and the document landed with only the Choice section. The handler and core writer are correct at every historical version; the drop happens at the tool boundary: the MCP SDK validates arguments with zod object schemas in default strip mode, so any argument key the schema does not declare — an agent typo, or a stale tool schema cached by the host — is silently discarded and the call still succeeds. This is the same class as the WO-100 file_work_order body-drop. The write surface must fail loudly: every MCP tool that writes to veri/ gets a strict input schema, so an unrecognized key is an InvalidParams error naming the key instead of silent content loss.

## In scope

- Strict input schemas (zod .strict()) for the MCP write tools in packages/mcp/src/server.ts: file_decision, file_work_order, file_requirement, file_source, file_receipt, amend_document, start_work_order
- The advertised JSON schema for those tools carries additionalProperties: false, so compliant hosts refuse near-miss keys client-side too
- An e2e test reproducing the DEC-112 drop: a file_decision call with a misspelled section key is refused with an error naming the unknown key, and no document is written or id consumed
- An e2e test proving a fully-specified file_decision persists every provided section through the built server
- A tools/list assertion that every write tool advertises additionalProperties: false

## Out of scope

- Read-only tool schemas (get_context, get_document, get_neighbors, search, run_check, get_intent, get_import_instructions) — extra keys there cannot lose data, and strictness could break lenient hosts for no benefit
- Changes to writeback.ts section composition or core createDocument — both verified correct
- CLI or app filing surfaces — they call typed functions, not a wire boundary

## Requirements

- [[REQ-003]] — implements

## Acceptance tests

- [x] e2e: file_decision with an unknown argument key returns an InvalidParams error naming the key; the veri/ tree is untouched
- [x] e2e: file_decision with title, choice, rejected_alternatives, rationale lands all three sections in the written document
- [x] e2e: tools/list shows additionalProperties: false on every write tool input schema
- [x] veri check reports zero issues

## Receipts

- 2026-08-27 — 7c4ff0f — packages/mcp/src/server.ts, packages/mcp/src/server.e2e.test.ts — Strict schemas on the seven write tools; e2e reproduces the DEC-112 drop and proves refusal + full-section persistence (DEC-119)
