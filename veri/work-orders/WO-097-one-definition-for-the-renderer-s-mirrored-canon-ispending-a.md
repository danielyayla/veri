---
id: WO-097
type: work-order
title: "One definition for the renderer's mirrored canon — isPending and the canonical strings reach the browser from core"
status: done
created: 2026-08-25
updated: 2026-08-25
links:
  - id: DEC-046
    rel: constrained-by
  - id: REQ-008
    rel: implements
  - id: SRC-006
    rel: designed-by
---

## Summary

The renderer's three hand-kept mirrors of core logic (isPending, PACKAGE_RULES_TEXT, importKickoffPrompt) and the sidecar's fourth inline copy are replaced by imports of core's one definition, via the DEC-046 subpath mechanism. This fixes a live drift bug: the mirrors omit core's workflow clause, so a draft workflow document never reaches NEEDS REVIEW, never gets the review affordance, and appendReviewNote throws on it.

## In scope

- Core: isPending moves from check.ts into a new pure module (pending.ts); PACKAGE_RULES and importKickoffPrompt move from node-flavored context.ts/brownfield.ts into a new pure module (prompts.ts); the main entry re-exports both so no node-side consumer changes
- Core package.json exports gain "./pending" and "./prompts" beside "./ids" and "./dates"
- Renderer: derive.ts deletes the three mirrors and re-exports core's definitions from the subpaths, so the six consumer files keep their import sites
- Sidecar: appendReviewNote's inline pending predicate (ui/src/lib/write.ts) becomes core's isPending via the main entry (Node context needs no subpath)
- The two drift tests holding mirrors to core's truth (derive.test.ts) are deleted; a regression test pins the fixed behavior — a draft workflow document appears in pendingDocs and accepts a review note without throwing

## Out of scope

- Any visual change — draft workflows surface through the existing NEEDS REVIEW and review-affordance designs
- Retiring other derive.ts derivations or narrowing its export list (candidate 8 territory)
- Bundling core's main entry into the renderer (rejected by DEC-046)

## Requirements

- [[DEC-046]] — constrained-by
- [[REQ-008]] — implements
- [[SRC-006]] — designed-by

## Acceptance tests

- [x] grep finds exactly one definition each of isPending, PACKAGE_RULES, and importKickoffPrompt across packages/ (mirrors and the write.ts inline copy gone) — only pending.ts and prompts.ts match
- [x] A draft workflow document appears in pendingDocs and appendReviewNote accepts it — the drift bug is regression-tested — derive.test.ts pendingDocs test gains a draft WF-002; write.test.ts "appendReviewNote accepts a draft workflow document"
- [x] The two mirror drift tests are deleted; remaining suites green — 636 tests pass across all workspaces
- [x] The renderer bundle builds (esbuild) — the new subpaths pull no node built-ins into app.bundle.js — bundle inspected: zero node: module imports
- [x] veri check green — 0 issues over 266 documents (the standing WO-034 receipt-wording advisory only)

## Receipts

- 2026-08-25 · 5923f99 · packages/core/src/{pending.ts,prompts.ts,check.ts,context.ts,brownfield.ts,brownfield.test.ts,index.ts}, packages/core/package.json, packages/ui/src/renderer/{derive.ts,derive.test.ts}, packages/ui/src/lib/{write.ts,write.test.ts}, action/dist/index.js — the three renderer mirrors and the write.ts inline copy replaced by core's one definition via the ./pending and ./prompts subpaths; schema.ts's PACKAGE_RULES removal rode a concurrent session's commit 9e172e7.
