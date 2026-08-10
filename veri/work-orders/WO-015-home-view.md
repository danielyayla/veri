---
id: WO-015
type: work-order
title: Home view — the default tab that answers "what needs attention"
status: done
created: 2026-08-10
updated: 2026-08-10
links:
  - id: REQ-004
    rel: extends
  - id: SRC-005
    rel: designed-by
  - id: DEC-008
    rel: constrained-by
  - id: DEC-012
    rel: constrained-by
  - id: WO-012
    rel: depends-on
  - id: WO-013
    rel: depends-on
  - id: WO-014
    rel: depends-on
---

## Summary

Layer 4 of the [[SRC-005]] navigation model. `homeview` becomes a view
key like `board`: a view tab (closeable, one instance) that is the
default tab on project open, reachable from the icon rail (⌂, first
item) and the command palette ("home" surfaces it via the shared
`VIEW_META`). The screen is a 920px-centered column — project name +
mono doc count ("N docs · M living") — over a 2×2 card grid:

1. **HEALTH** — `veri check` issues; issue-kind chip + doc id +
   message; issue count in the header. The topbar `veri check` chip now
   deep-links here (per the handoff) instead of opening its popover,
   which is removed — its content is this card.
2. **IN FLIGHT** — work orders in backlog/in-progress: id · title ·
   ⌁ agent marker (receipt-derived, as on the Board) · linked-REQ count
   (amber when 0) · status.
3. **AGENT ACTIVITY** — project-wide write-back feed, newest first:
   this session's logged actions plus file-derived receipts and filed
   decisions; doc id (type color) · text · relative time.
4. **RECENTLY CHANGED** — docs by `updated` desc: id · title ·
   relative time.

Every row opens its document as a shared preview tab ([[WO-012]]
semantics). Visuals are pixel-specified in
`design/navigation-model/README.md`.

## In scope

- `homeview` in `VIEW_META` (Home ⌂) — tab strip, palette view rows,
  and ⌃Tab cycling pick it up through the existing machinery.
- Boot: when no `?view=` / `?doc=` param produced a tab, open Home as
  the preview tab (replaces "first document as preview").
- Rail: ⌂ as the first item.
- Topbar health chip: opens Home (preview) instead of the check
  popover; popover code and styles removed.
- Pure, unit-tested derivations in `derive.ts`: in-flight rows,
  project-wide activity feed (session + receipts + filed decisions,
  date-sorted, capped), recently-changed rows.
- `views/home.ts` + styles per the README's pixel values; muted empty
  rows for clean/quiet projects.

## Out of scope

- Any change to `packages/core`, `packages/cli`, or the MCP server.
- Everything the README defers: per-type list views, area/epic
  metadata, timeline view, tab persistence across restarts, graph-view
  expansion.

## Acceptance tests

- [x] A fresh project open shows Home as the (preview) tab; Home is
      closeable, single-instance, and reopenable from rail ⌂ and the
      palette row "Home".
- [x] HEALTH lists each `veri check` issue with kind chip, doc id, and
      message; the topbar chip opens Home; a clean project shows a
      muted empty row.
- [x] IN FLIGHT lists exactly the backlog/in-progress work orders with
      REQ counts (amber at 0), receipt-derived ⌁ markers, and status.
- [x] AGENT ACTIVITY interleaves session actions, receipts, and filed
      decisions newest-first; RECENTLY CHANGED orders docs by `updated`
      descending.
- [x] Every card row opens its doc as the shared preview tab.
- [x] Derivation unit tests pass; `npm test` green across the
      workspace.
- [x] `veri check` reports zero issues.

## Receipts

- 2026-08-10 — 2688de9 — packages/ui/src/renderer/tabs.ts, packages/ui/src/renderer/derive.ts, packages/ui/src/renderer/derive.test.ts, packages/ui/src/renderer/views/home.ts, packages/ui/src/renderer/app.ts, packages/ui/src/renderer/palette.test.ts, packages/ui/renderer/styles.css — Home view per SRC-005 layer 4: default preview tab, rail ⌂ + palette row via VIEW_META, health-chip deep-link (check popover removed), four cards from pure tested derivations (3 new tests); default-tab and card contents verified via the screenshot harness; npm test 132 pass, veri check clean (agent session, Claude Code).
