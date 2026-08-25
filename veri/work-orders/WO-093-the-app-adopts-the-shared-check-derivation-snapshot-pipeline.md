---
id: WO-093
type: work-order
title: "The app adopts the shared check derivation — snapshot pipeline on core's typed findings stage"
status: done
created: 2026-08-25
updated: 2026-08-25
links:
  - id: REQ-025
    rel: implements
  - id: DEC-081
    rel: constrained-by
  - id: DEC-040
    rel: constrained-by
  - id: DEC-025
    rel: constrained-by
  - id: SRC-031
    rel: designed-by
---

## Summary

The desktop app's snapshot pipeline stops hand-orchestrating the check tier and consumes the same core derivation the CLI, Action, and MCP server already share — closing the gap where binding-drift and bound-test advisories never reach the app, and carrying skip notes into the Snapshot. Core's report module splits into a typed findings stage plus the existing presentation view; MCP's RunCheckResult field-rename of CheckReport is retired.

## In scope

- Split packages/core/src/report.ts in two stages: a typed findings derivation (issues as Issue[], advisories as Advisory[], skips as string[]) and buildCheckReport as a presentation view over it, byte-identical output to today
- Both snapshot paths (buildSnapshot and SnapshotBuilder.build in packages/ui/src/lib/snapshot.ts) call the typed findings stage instead of composing detectors by hand — the app gains checkBindingDrift and checkBoundTests
- The app's git-facts collector grows unavailability reasons (shallow clone, no repository) so skip notes carry real text
- The app collects test facts via @verikb/cli's collectTestFacts (the blessed ui → cli edge, DEC-016/DEC-060)
- Snapshot gains skips: string[] — carried, not rendered by any view
- packages/mcp/src/check.ts serializes CheckReport directly (plus its derived ok boolean); the RunCheckResult field-rename dies

## Out of scope

- Rendering skip notes in any app view (follow-up work order once designed)
- Moving fact collectors into core or across surfaces (DEC-040, DEC-081 stand)
- Changing the CLI/MCP parity test's subprocess mechanism — the spawn keeps the mcp → cli edge out of the observed-import scan and pins the collector mirrors (DEC-081)
- Any change to CLI, Action, or MCP tool output shapes beyond the RunCheckResult retirement

## Requirements

- [[REQ-025]] — implements
- [[DEC-081]] — constrained-by
- [[DEC-040]] — constrained-by
- [[DEC-025]] — constrained-by
- [[SRC-031]] — designed-by

## Acceptance tests

- [x] Over a fixture corpus with binds declarations, the app snapshot contains binding-drift and bound-test advisories identical to buildCheckReport's — snapshot.test.ts "snapshot findings equal the CLI report over one bound corpus" deep-equals findings against the CLI's checkReport and asserts drift-missing-test and drift-unclaimed-change are present
- [x] Snapshot.skips matches CheckReport.skips over the same corpus and host facts (including the shallow-clone and no-git degradations) — the two WO-093 skip-parity tests cover the not-a-repository and shallow-clone cases against the CLI report
- [x] buildCheckReport output is byte-identical to before the split (existing CLI/MCP/Action tests green, parity test green) — full suite 316+16 pass; the WO-089 parity test passes unchanged in mechanism
- [x] The snapshot equivalence test (WO-051) still holds SnapshotBuilder to buildSnapshot's shape, now including skips — deepEqual covers the new field; suite green
- [x] RunCheckResult no longer exists in @verikb/mcp's exports; the run_check tool output is unchanged or its change is stated in the tool description — runCheck returns core's CheckReport; the tool's pass/violations/skipped keys are serialized at the server edge, output byte-identical
- [x] veri check green — 0 issues over 260 documents (one pre-existing WO-034 receipt-wording advisory, unrelated)

## Receipts

- 2026-08-25 · c0ea50e (+ 2db14e3 shallow-clone test) · packages/core/src/report.ts, packages/cli/src/index.ts, packages/ui/src/lib/snapshot.ts, packages/ui/src/lib/snapshot.test.ts, packages/ui/src/renderer/{archderive,derive}.test.ts, packages/mcp/src/{check.ts,server.ts,check.test.ts}, action/dist/index.js — deriveFindings lands in core, both snapshot paths adopt it (binding drift + bound tests + skips reach the app), RunCheckResult retired.
