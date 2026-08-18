---
id: WO-035
type: work-order
title: Labeled sidebar and type panel
status: done
created: 2026-08-18
updated: 2026-08-18
links:
  - id: SRC-014
    rel: designed-by
  - id: REQ-004
    rel: extends
  - id: DEC-014
    rel: constrained-by
  - id: DEC-012
    rel: constrained-by
---

## Summary

Replaces the 44px icon rail and the working-set sidebar with the
[[SRC-014]] labeled sidebar (216px: Home, the four document
collections, Board, Graph, Settings gear at the foot) and adds the
280px type panel — the per-type browsing surface [[SRC-005]]
deferred. Pins migrate to each panel's PINNED group; the sidebar's
RECENT section retires (Home's Recently-changed card covers it).
The high-fidelity bundle lives in `design/sidebar-navigation/`.

## In scope

- The 216px labeled sidebar per the design bundle: Home row;
  collection rows (type swatch, living count, panel caret) for
  Requirements, Decisions, Sources, Work Orders; Board and Graph
  rows; Settings gear row at the foot with the 6px agent-status
  dot. Icon rail and old sidebar removed.
- The 280px type panel: header (swatch, label, total count, ✕),
  autofocused live filter over id + title, PINNED group, living
  list newest-id-first, dimmed in-place expander for dead
  documents. Living = REQ `draft`/`accepted`, DEC `active`, WO
  `backlog`/`in-progress`, SRC all.
- Browser-not-route semantics: opening/toggling a panel never
  changes the active tab; row click opens the shared preview tab,
  double-click pins ([[WO-012]] semantics); selecting a view row
  closes the panel.
- Pin migration: existing pins from the [[DEC-014]] workspace
  state surface in the PINNED groups; pin chip stays in the
  document header; RECENT section retired (drop its sidebar
  consumer, keep the recents data for Home).
- Interim gear behavior so nothing goes unreachable before
  [[WO-036]]: the gear opens a minimal popover reaching the
  existing Templates and Agent connection surfaces unchanged.

## Out of scope

- The Settings view and full popover grouping ([[WO-036]]).
- Per-type table views (deferral stands per [[SRC-005]] /
  [[SRC-014]]).
- Drag-reorder of pins in the panel.
- Any change to tabs, palette, Home, Board, Graph, or document
  views.

## Requirements

Extends [[REQ-004]] (desktop UI). Designed by [[SRC-014]]; the
design bundle in `design/sidebar-navigation/` is the visual spec
([[DEC-012]] gate satisfied on its approval, 2026-08-18).

## Acceptance tests

- [x] Icon rail and working-set sidebar are gone; the labeled
      sidebar matches the bundle (rows, swatches, living counts,
      carets, group dividers, Settings foot row with status dot)
- [x] Clicking a collection toggles its panel without changing the
      active tab; clicking any view row closes the panel
- [x] Panel filter matches id and title across living and dead
      rows; dead documents sit behind a dimmed expander with
      correct counts
- [x] Row click opens the shared preview tab; double-click pins
- [x] Existing pins appear in PINNED groups and survive restart
      per [[DEC-014]]; RECENT is gone and Home's Recently-changed
      card still works
- [x] Templates and Agent connection remain reachable via the gear
- [x] `veri check` and `npm test` are clean

## Receipts

- 2026-08-18 — d920297 — packages/ui/src/renderer/sidebar.ts, packages/ui/src/renderer/sidebar.test.ts, packages/ui/src/renderer/app.ts, packages/ui/src/renderer/widgets.ts, packages/ui/renderer/styles.css — claude-code session: full implementation after Daniel approved SRC-014 (2026-08-18). Labeled 216px sidebar replaces the rail + tree; 280px type panel (filter over id+title, PINNED group from the DEC-014 workspace state, newest-first living list, in-place dead expander, WO-030 ghost row re-homed for empty collections); browser-not-route semantics with WO-012 preview/double-click-pin opens; RECENT retired; interim gear popover reaches Templates and Agent connection. Two deliberate deltas from the bundle, both flagged to Daniel: the agent-status dot is static (a pulse would imply live client status, which REQ-005 forbids) and the panel header gains a small + so document creation stays reachable with the per-section + gone. Verified via the screenshot harness against this repo (panel open/closed, pins, expander, filter, settings popover, empty project). 252 tests pass across the workspace, veri check clean.
