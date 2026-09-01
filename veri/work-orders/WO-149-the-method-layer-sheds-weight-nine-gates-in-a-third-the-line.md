---
id: WO-149
type: work-order
title: "The method layer sheds weight — nine gates in a third the lines"
status: backlog
created: 2026-09-01
updated: 2026-09-01
links:
  - id: REQ-040
    rel: amends
  - id: SRC-063
    rel: revises
  - id: SRC-066
    rel: derived-from
# binds:         # code this work order claims (optional)
#   paths: []    # repo-root-relative globs
#   tests: []    # test files proving it (path or path::name)
---

## Summary

The nine methods total 2,373 lines, authored to SRC-066's most striking find: SRC-063, a standard that prescribes 120–220-line documents with per-section word budgets — a written policy for producing length, the inverse of the playbook's "keep it under a page; anything stale is taking up context for no benefit." The diet keeps what earns its place — the interview beats, the guardrails, the non-optional promotion sentence — and drops the restatement the four-altitude discipline already carries. Target: roughly a third of today's volume, with WO-147's runner proving no routing regression.

## In scope

- Rewrite the nine methods to roughly 700 total lines, preserving every beat's function, every guardrail's substance, and the mandatory REQ-008 promotion sentence in each
- File a successor form note superseding SRC-063's word budgets with a ceiling (a method fits in two screens) and the rules that survive (restate the act, link the rule; mechanical MCP facts restated in full)
- Regenerate the shells; carry the rewrite to packages/cli/methods via the existing upgrade path so shipped copies stay byte-identical
- Run the corpus (WO-147's runner) before and after; descriptions may tighten only within the no-regression floor

## Out of scope

- Changing any gate's semantics, tools, or filing behavior (a diet, not a redesign)
- New methods (WO-146 owns veri:review)
- The truth fixes (WO-148 lands first; this rewrites what is already true)

## Requirements

- [[REQ-040]] — amends
- [[SRC-063]] — revises
- [[SRC-066]] — derived-from

## Acceptance tests

- [ ] Total lines across veri/methods/*.md at or under the target, with every method keeping its six sections and its promotion guardrail verbatim
- [ ] The corpus floor holds: no regression on coverage cases, zero false triggers on the negative set
- [ ] packages/cli/methods matches veri/methods byte-for-byte after the upgrade pass
- [ ] The successor form note is filed and SRC-063's budgets no longer govern
- [ ] Full suite green

## Receipts

(none yet)
