---
id: WO-153
type: work-order
title: "Dead paths and stale artifacts are deleted"
status: done
approved: 2026-09-01
claimed_by: fable-wo153
claimed_at: 2026-09-01
created: 2026-09-01
updated: 2026-09-01
links:
  - id: REQ-019
    rel: implements
  - id: REQ-002
    rel: constrained-by
  - id: SRC-066
    rel: derived-from
# binds:         # code this work order claims (optional)
#   paths: []    # repo-root-relative globs
#   tests: []    # test files proving it (path or path::name)
---

## Summary

The audit's basket of built-but-broken and built-but-unused, each independently verifiable: veri new workflow emits a malformed veri// path and silently permits a second workflow document; veri new product passes the type check and always throws; --harness accepts exactly one value for a second harness that does not exist; a legacy searchDocs sits wired to nothing; ~890KB of site assets are referenced by zero pages; recordSeededIds' regex omits PRD and MET so a future starter would corrupt the id floor; enumerate.ts's status comment says six types where there are seven. None of these serve the loop; all of them cost trust when found.

## In scope

- veri new workflow: fix the path composition and refuse creation while a non-retired workflow document exists (choices filed as a proposed DEC en route if non-trivial)
- veri new product: remove product from the accepted type list with an error naming the fixed singleton paths
- Drop --harness until a second emitter exists; delete the unwired searchDocs; delete the orphaned site assets (loop-demo.gif, loop-demo-still.png, review-dark.png, review-light.png)
- recordSeededIds covers PRD and MET; the enumerate.ts comment counts seven types

## Out of scope

- Merging withdraw and delete (reverses DEC-110 for marginal gain; deliberately left standing)
- packages/ui and its gitignored Electron-era leftovers (local files, not repo state)
- The macOS-only veri open paths (real, but REQ-030's platform work owns it)

## Requirements

- [[REQ-019]] — implements
- [[REQ-002]] — constrained-by
- [[SRC-066]] — derived-from

## Acceptance tests

- [x] veri new workflow either creates a well-formed veri/WF-nnn-*.md path (covered by a new test) or refuses when a workflow exists, and never prints a veri// path
- [x] veri new product refuses with an error naming the four singleton paths
- [x] --harness and searchDocs are gone; no reference survives
- [x] The two truly orphaned assets are deleted and no site page breaks — amended from four at Daniel's direction 2026-09-01: the loop-demo pair became the README hero under WO-148 and stays
- [x] recordSeededIds records PRD/MET ids from a fixture starter; full suite green

## Receipts

- 2026-09-01 — 1599f35 — Shipped the scope's repairs and deletions (workflow path + singleton refusal, product refusal naming the singletons, harness selector and legacy substring search removed end to end, PRD/MET seed the id floor, seven-type comment, review-dark/review-light deleted), but only two of the four named assets were orphaned — WO-148 (fbcb41c) made loop-demo.gif/loop-demo-still.png the README hero after the audit, so the asset criterion as written is unsatisfiable and the done flip awaits your judgment; no verify: declared — full suites green (core 349, cli 86, mcp 104, action 10, ui 340) and veri check 0 issues.
