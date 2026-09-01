---
id: WO-157
type: work-order
title: "The app forgets ready — dead lanes and a receipt segment that no longer exists"
status: done
approved: 2026-09-02
claimed_by: fable-wo157
claimed_at: 2026-09-02
created: 2026-09-02
updated: 2026-09-02
links:
  - id: REQ-004
    rel: implements
  - id: SRC-074
    rel: designed-by
  - id: DEC-143
    rel: constrained-by
  - id: DEC-142
    rel: constrained-by
  - id: DEC-012
    rel: constrained-by
  - id: WO-152
    rel: follows-from
  - id: WO-148
    rel: follows-from
binds:
  paths: [packages/ui]
verify: npm test -w @verikb/ui
---

## Summary

Format 5 removed `ready` and DEC-142 removed the receipt files segment, but the renderer still builds both: a Ready lane in the sidebar status map and living-groups (sidebar.ts:15, sidebar.ts:120; derive.ts:364) with tests asserting the lane, and a per-receipt `r.files` block (views/workorder.ts:121) with its `.receipt-files` style. Both are unreachable today and wrong the day a document regresses. WO-148 also recorded real drift it could not touch: the connection panel hardcodes a four-tool list against eighteen registered tools. One pass removes the dead branches and makes the tool list truthful. Design gate: this work order touches packages/ui, so it is planned now and starts only when a design note is linked `designed-by` — the SRC-068/SRC-070-scale note suffices for deletions of this kind.

## In scope

- Remove the `ready` status from the sidebar status map, the Ready living-group, and the derive filter; update the tests that assert the lane
- Remove the receipt `files` rendering from the work-order detail and the `.receipt-files` style
- The connection panel's tool list becomes derived from the server's registered tools (or, if a static list is kept by design, it names all of them and the design note argues why)
- Declare `binds: paths: [packages/ui]` on this work order (edit applied at filing, since the MCP schema carries no binds parameter)

## Out of scope

- Any new UI surface, view, or behavior — this is deletion and truth, not features
- Non-UI packages; receipt parsing in core (DEC-142's shape stands)
- The gitignored Electron-era local artifacts (WO-153 already scoped them out as non-repo state)

## Acceptance tests

- [x] No `'ready'` status literal remains in packages/ui renderer source or tests
- [x] The work-order detail renders each receipt as date — ref — sentence only, and the `.receipt-files` style is gone
- [x] The connection panel's tool list matches the server's actual registered tools, by derivation or by a design-argued complete list
- [x] The packages/ui suite passes — the declared verify command proves it
- [x] The design gate is honored: a `designed-by` link is present before the work starts (named blocker: the design note)

## Receipts

- 2026-09-02 — 632feb0 — ["packages/ui/src/renderer/sidebar.ts", "packages/ui/src/renderer/derive.ts", "packages/ui/src/renderer/views/workorder.ts", "packages/ui/src/renderer/views/mcp.ts", "packages/ui/renderer/styles.css"] — verify ran clean (npm test -w @verikb/ui — 340/340 pass, exit 0; build exit 0) — READY lane out of sidebar/livingGroups/inFlight, receipt files block and .receipt-files rule gone, connection panel lists all eighteen tools grouped per SRC-074, tests moved to live statuses (statuswrite's refusal guard keeps coverage with a non-retired input), zero quoted 'ready' literals remain in renderer source or tests, veri check 439 docs 0 issues.
