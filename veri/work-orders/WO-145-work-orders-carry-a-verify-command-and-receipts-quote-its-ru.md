---
id: WO-145
type: work-order
title: "Work orders carry a verify command, and receipts quote its run"
status: done
approved: 2026-09-01
claimed_by: fable-wo145
claimed_at: 2026-09-01
created: 2026-09-01
updated: 2026-09-01
links:
  - id: REQ-042
    rel: implements
  - id: REQ-006
    rel: constrained-by
  - id: REQ-021
    rel: consistent-with
  - id: SRC-066
    rel: derived-from
# binds:         # code this work order claims (optional)
#   paths: []    # repo-root-relative globs
#   tests: []    # test files proving it (path or path::name)
---

## Summary

The largest playbook gap SRC-066 found: nothing in Veri verifies the software — veri check audits the record, acceptance boxes are ticked on trust, and binds.tests never fires over MCP. The smallest Stage-4 mechanism: an optional verify: field on the work order — one command that must exit 0 (npm test, a script, a curl check). The agent's harness runs it (core and MCP stay subprocess-free); the implement method requires running it before the receipt and quoting the result; a check advisory flags the gap when it was declared and never evidenced. BLOCKER: no accepted requirement states the code-verification intent — veri:define should mint it (constraint kind) before this is approved, so the criteria trace to a clause.

## In scope

- verify: as an optional work-order frontmatter field (a single command string), in the schema and the template's commented block
- The context package renders verify: in the work-order section so every briefed agent sees the bar
- Advisory: a done work order declaring verify: none of whose receipts mention a verify run
- MET-001 (implement) gains the beat: run verify:, quote its exit status in the receipt; the dispatch workflow's kickoff prompt names it

## Out of scope

- Executing the command from core, CLI check, or MCP (no subprocess in the check path; the agent's harness runs it — DEC-040, DEC-125 hold)
- Test-edit locks and hooks (harness configuration; documented as a pattern, not productized)
- Any test framework or result parsing beyond the receipt's own sentence
- Retiring binds.tests (separate judgment; noted for the health sweep)

## Requirements

- [[REQ-006]] — constrained-by
- [[REQ-021]] — consistent-with
- [[SRC-066]] — derived-from

## Acceptance tests

- [x] The work-order schema accepts verify: and round-trips it; invalid shapes are invalid-frontmatter
- [x] A context package for a work order with verify: shows the command in the work-order section
- [x] The advisory fires on a done fixture with verify: and no verify-mentioning receipt, and stays silent when a receipt quotes the run
- [x] MET-001 and the dispatch kickoff prompt instruct running verify: before the receipt
- [x] Full suite green

## Receipts

- 2026-09-01 — 2f94bd6, 38c570b, 71f7b0b — verify: lands as an optional work-order command (schema round-trip, context-package line, verify-unevidenced advisory per DEC-149 proposed), MET-001 and the dispatch kickoff prompt require the run before the receipt; full suite green (938 tests, exit 0) and veri check 0 issues.
