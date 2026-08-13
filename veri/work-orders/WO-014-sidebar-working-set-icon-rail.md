---
id: WO-014
type: work-order
title: Sidebar working set + icon rail — pins, recents, lifecycle-filtered tree
status: done
created: 2026-08-10
updated: 2026-08-13
links:
  - id: REQ-004
    rel: extends
  - id: SRC-005
    rel: designed-by
  - id: DEC-008
    rel: constrained-by
  - id: DEC-010
    rel: follows-from
  - id: DEC-012
    rel: constrained-by
  - id: WO-012
    rel: depends-on
---

## Summary

Layer 3 of the [[SRC-005]] navigation model. A 44px icon rail on the
left edge (Board ▤, Graph ◉, Decisions §, agent-connection ⌁ with a
status dot at the bottom) replaces the sidebar's nav rows and its agent
footer strip; rail items show instant custom tooltips and open their
view as a preview tab. The sidebar becomes a working set: PINNED
(user-starred docs, ✕ to unpin, drag to reorder, hidden when empty),
RECENT (last 8 opened, most recent first, excluding pinned), then the
type-grouped tree filtered live-by-default — each section lists only
living docs (REQ `draft`/`accepted`, DEC `active`, WO
`backlog`/`in-progress`) with a dimmed "N done" / "N superseded" /
"N retired" footer expander that shows the dead docs in place (with a
`✓` mark) and relabels to "hide …". Section headers show a type chip,
label, and living count; clicking one collapses the section. SOURCES
has no lifecycle — all docs, but collapsed by default. The pin action
lives in the document header as a bordered `☆ Pin` / `★ Pinned` chip.
All sidebar clicks keep [[WO-012]] preview semantics and the active-row
highlight keeps tracking the active tab. Row anatomy and health dots
are unchanged from the document-tabs design. Visuals are
pixel-specified in `design/navigation-model/README.md`; `rail` is the
approved layout.

Pins and recents are workspace state, not knowledge: they persist per
project in Electron userData (following the [[DEC-010]] precedent),
never in `veri/`. The storage format is [[DEC-014]]. Folder position inside `veri/` remains
presentation-only — the loader's recursive scan already surfaces docs
in subfolders inside their type section, and nothing (check, assembly,
search, this sidebar) reads directory position for meaning.

## In scope

- Main process: workspace-state load/save (one JSON in
  `userData/config`, keyed by project root) with colocated tests; IPC +
  preload + renderer API plumbing.
- Renderer: icon rail with instant custom tooltips and active tint;
  sidebar sections (PINNED with unpin + drag reorder, RECENT,
  lifecycle-filtered tree with per-type collapse and dead-doc
  expanders, SOURCES collapsed by default); pin chip in the reader and
  work-order document headers; removal of the old sidebar nav rows and
  agent footer strip (the rail owns ⌁ now).
- Pure, unit-tested derivations for living/dead splits and the
  visible-recents rule; recents updated on every doc open (cap 10
  stored, 8 shown).

## Out of scope

- The Home view and its rail item ⌂ (WO-015 — the rail gains Home when
  the view exists).
- A tab context menu (the README notes pinning "belongs in the tab
  context menu in production"; the shipped tabs design [[SRC-004]] has
  no context menu — that is its own follow-up).
- Rendering folder hierarchy inside type sections: the prototype's tree
  is flat and the handoff specifies no folder-row visuals. Docs in
  subfolders appear in their type section today; a folder-mirroring
  tree waits for its own design pass.
- Command-palette changes (WO-013, shipped) and everything the README
  defers (per-type list views, area/epic metadata, timeline, tab
  persistence, graph expansion).

## Requirements

Extends [[REQ-004]] — the desktop app.

## Acceptance tests

- [x] Rail shows Board / Graph / Decisions and the ⌁ agent button with
      a health-colored status dot; hovering shows the custom tooltip
      instantly; the active view tab tints its rail item; clicking
      opens the view as a preview tab.
- [x] `☆ Pin` in a document header pins the doc (chip flips to
      `★ Pinned`); the PINNED section lists it, ✕ unpins, drag
      reorders, and the section hides when empty.
- [x] Opening docs feeds RECENT (most recent first, pinned docs
      excluded, 8 shown); pins and recents survive an app restart and
      are stored per project in userData — nothing is written to
      `veri/`.
- [x] Tree sections list only living docs with a living count in the
      header; the dimmed footer expander ("2 done", "1 superseded",
      "1 retired") reveals dead docs in place with ✓ marks and
      relabels to "hide …"; header click collapses the section;
      SOURCES is collapsed by default and shows all docs when opened.
- [x] Sidebar clicks still open the shared preview tab; the active-row
      highlight follows the active tab.
- [x] Workspace-state and sidebar-derivation unit tests pass; `npm
      test` green across the workspace.
- [x] `veri check` reports zero issues.

## Receipts

- 2026-08-10 — e9badd6 — packages/ui/src/lib/workspace.ts, packages/ui/src/lib/workspace.test.ts, packages/ui/src/main.ts, packages/ui/src/preload.mts, packages/ui/src/renderer/api.ts, packages/ui/src/renderer/app.ts, packages/ui/src/renderer/sidebar.ts, packages/ui/src/renderer/sidebar.test.ts, packages/ui/src/renderer/dom.ts, packages/ui/src/renderer/widgets.ts, packages/ui/src/renderer/views/reader.ts, packages/ui/src/renderer/views/workorder.ts, packages/ui/renderer/styles.css, veri/decisions/DEC-014 — Icon rail + working-set sidebar per SRC-005 layer 3: pins/recents persisted per project in userData (DEC-014, 3 tests), lifecycle-filtered tree derivations (5 tests), pin chips in doc headers; persistence across restart, tooltips, expanders, and live filtering verified via the screenshot harness; npm test 128 pass, veri check clean (agent session, Claude Code).
