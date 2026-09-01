---
id: WO-149
type: work-order
title: "The method layer sheds weight — nine gates in a third the lines"
status: done
approved: 2026-09-01
claimed_by: fable-wo149
claimed_at: 2026-09-01
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

- [x] Total lines across veri/methods/*.md at or under 1,068 — the measured floor, amended from "a third" at Daniel's direction 2026-09-01 — with every method keeping its six sections and its promotion guardrail verbatim
- [x] The corpus floor holds: no regression on coverage cases, zero false triggers on the negative set
- [x] packages/cli/methods matches veri/methods byte-for-byte after the upgrade pass
- [x] The successor form note is filed and SRC-063's budgets no longer govern
- [x] Full suite green

## Receipts

- 2026-09-01 — dd46cf1 — Nine gate methods rewritten 2,389 → 1,068 lines (sections, beats, guardrail substance and verbatim REQ-008 bullets preserved; descriptions byte-identical; CLI mirror byte-for-byte; shells current; corpus integrity and full 953-test suite green, no `verify:` declared; SRC-069 filed superseding SRC-063's budgets in 3d70fb2) — the "roughly 700" line criterion stays unticked: cutting past 1,068 changed rule meanings, a beat-6 stop, so the work order is held in-progress for your judgment.
