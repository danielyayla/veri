---
id: WO-107
type: work-order
title: "The Architecture sidebar row — promote the view to primary navigation per SRC-049"
status: done
claimed_by: claude-arch-row
claimed_at: 2026-08-25
approved: 2026-08-25
created: 2026-08-25
updated: 2026-08-25
links:
  - id: SRC-049
    rel: designed-by
  - id: DEC-108
    rel: constrained-by
  - id: REQ-004
    rel: implements
# binds:         # code this work order claims (optional)
#   paths: []    # repo-root-relative globs
#   tests: []    # test files proving it (path or path::name)
---

## Summary

Add the `⌗ Architecture` view row to the sidebar below the four collection rows, wired to the existing `openArchitecture()` tab, always rendered, with active-state and panel-close semantics matching the other view rows. Resolves the placement SRC-036 left provisional, per SRC-049 / DEC-108.

## In scope

- A `viewItem`-anatomy sidebar row `⌗ Architecture` in `packages/ui/src/renderer/app.ts` (`sidebar()`), positioned below the collection rows and above the sidebar foot.
- Click opens the existing one-instance Architecture preview tab (`openArchitecture()`); selecting it closes any open type panel per SRC-014; `nav-item-active` when the architecture tab is the active target.
- Always rendered — with an empty module registry the row opens the view's existing empty-state card (DEC-059 hint).
- Amend REQ-004's navigation description; the post-stamp drift advisory is the intended path to Daniel's re-approval.
- Renderer tests for the row's presence, click behavior, and active state.

## Out of scope

- Any change to the four collection rows, the type panel, or the Work Orders ▤ Board row.
- Any row atop the Decisions panel (rejected in SRC-049/DEC-108).
- Removing the Home ARCHITECTURE card, ⌘K entry, or `architecture ↗` affordances — the row supplements them.
- Any change to the Architecture view's internals (Map, Rules, detail panel).

## Requirements

- [[SRC-049]] — designed-by
- [[DEC-108]] — constrained-by
- [[REQ-004]] — implements

## Acceptance tests

- [x] The sidebar renders `⌗ Architecture` below the collection rows in every project, including one with no module registry.
- [x] Clicking the row opens the one-instance Architecture tab with preview semantics and closes any open type panel.
- [x] The row shows the active state exactly when the architecture tab is the active target.
- [x] With an empty registry, the opened view shows the existing empty-state card.
- [x] `veri check` passes; REQ-004 amendment surfaces as the expected drift advisory until re-approved.

## Receipts

- 2026-08-25 — 693b854 — `packages/ui/src/renderer/app.ts`,
  `packages/ui/src/renderer/tabs.test.ts`,
  `veri/requirements/REQ-004-desktop-ui.md` — The `⌗ Architecture` view
  row lands below the collections via the existing `viewItem` anatomy
  and `setView('architecture')`, which supplies preview semantics,
  panel-close, and active state; row rendering is unconditional (the
  view's DEC-059 empty-state card serves registry-less projects, a
  WO-068 behavior this change reuses untouched). Typecheck clean,
  331/331 renderer tests pass (new: architecture-tab retention),
  `veri check` 0 issues; the REQ-004 drift advisory is present as
  intended. Verified at the logic/build tier like WO-103 — a visual
  pass in the running app remains Daniel's smoke check.
