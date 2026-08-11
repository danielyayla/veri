---
id: WO-017
type: work-order
title: Approval gate UI — review queue, approve flow, gated work orders
status: done
created: 2026-08-10
updated: 2026-08-10
links:
  - id: REQ-008
    rel: implements
  - id: SRC-006
    rel: designed-by
  - id: REQ-004
    rel: depends-on
  - id: WO-016
    rel: depends-on
  - id: DEC-012
    rel: constrained-by
---

## Goal

Implement the approval-gate UI in `packages/ui` per the [[SRC-006]]
design handoff (`design/approval-gate/README.md` is the authoritative
spec — copy, tokens, and measurements are final).

Blocked until [[WO-016]] ships the mechanics and [[REQ-008]] is
accepted — this work order is itself gated by the gate it builds.

## In scope

- Home: NEEDS REVIEW card above the grid, oldest-first, hidden when
  empty.
- Document view: review banner on pending docs — provenance line,
  "What approving means" disclosure built from graph links, approve
  popover showing the exact frontmatter diff, request-changes composer
  appending to `## Review notes`.
- Sidebar/palette: amber pending dots; `is:proposed` filter.
- Gated WOs: `gated · <ID>` chips in WO header and IN FLIGHT rows;
  agent-kickoff actions disabled with the specced tooltip.
- File writes through the shared library write path (re-read, edit,
  write, re-parse), same as MCP writeback.

## Out of scope

- Bulk approve, reject/delete buttons (per spec, deliberately absent).
- Comprehension quiz. Diff-since-review-note view. Git hooks.
- Any change to core/check/MCP beyond consuming WO-016's API.

## Acceptance criteria

- [x] All four SRC-006 scenarios reproduced against real project files
      (home queue, review, approved, gated WO).
- [x] Approve writes the stamp-and-flip edit and the app re-renders
      from the re-parsed file, not from cached UI state.
- [x] Approve disabled (with tooltip) on documents with check issues.
- [x] Request changes appends the dated review note; doc stays queued.
- [x] Pending docs marked everywhere they appear; never filtered out.
- [x] `npm test` and `veri check` clean.

## Receipts

- 2026-08-11 — 48944a5 — packages/ui (write lib + IPC, app shell, derive, sidebar, theme, home/reader/workorder views, new views/review.ts, styles), packages/mcp/src/search.ts (is:proposed) — approval-gate UI shipped per SRC-006; all four scenarios + in-app approve/review-note verified live via the screenshot harness; 143 tests green, veri check clean.
