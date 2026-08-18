---
id: SRC-014
type: source
title: Design — Sidebar navigation with type panel and settings area
status: imported
created: 2026-08-18
updated: 2026-08-18
links:
  - id: REQ-004
    rel: designs
  - id: REQ-005
    rel: designs
  - id: REQ-010
    rel: designs
  - id: SRC-005
    rel: builds-on
  - id: DEC-014
    rel: constrained-by
  - id: DEC-012
    rel: constrained-by
---

> **Proposed — awaiting Daniel's approval.** Drafted 2026-08-18 from
> the navigation consolidation direction; the high-fidelity handoff
> bundle (README + interactive prototype) lives in
> `design/sidebar-navigation/`. Do not implement until this document
> carries an approval stamp.

Consolidates primary navigation: the icon rail and the working-set
sidebar merge into one labeled sidebar, document browsing moves to a
secondary type panel, and configuration surfaces move behind a
Settings entry at the sidebar foot. This is the design doc that
[[SRC-005]] deferred under "per-type list views", and it revises that
design's layer 3 while keeping its other layers — tabs, the ⌘K
palette, and the Home view — exactly as shipped.

## Motivation

The [[SRC-005]] shell splits navigation across two surfaces: a 44px
icon rail (views + agent connection) and a 250px sidebar (pinned,
recent, and the lifecycle-filtered tree). In practice the rail's
icon-only rows need tooltips to be legible, the sidebar mixes two jobs
(working set and inventory), and two configuration surfaces — Templates
([[REQ-010]], shipped by WO-024) and Agent connection ([[REQ-005]],
shipped by WO-007) — occupy primary-navigation slots they don't earn.
Consolidating gives every top-level destination a label, gives each
document type a dedicated browsing surface, and moves setup out of the
way of daily work.

## Principles

1. **Primary nav is what you work with; Settings is how you set up.**
   The sidebar lists Home, the four collections, Board, Graph — and
   nothing configuration-shaped. Templates, Agent connection, project
   identity, and app updates live in a Settings area reached from a
   gear row at the sidebar foot. A status dot on that row keeps agent
   health glanceable.
2. **The type panel is a browser, not a route.** Clicking a collection
   opens a 280px panel listing that type's documents; it never changes
   the active tab. Only clicking a document does (preview-tab
   semantics from [[SRC-004]], unchanged). Clicking the collection
   again closes it; selecting any view closes it.
3. **Lifecycle filtering carries over.** The panel lists living
   documents with dead ones behind a dimmed in-place expander, exactly
   as [[SRC-005]] specified for the tree; sidebar collection rows show
   living counts. This remains the scale lever — 32 work orders render
   as 2 rows plus "▸ 30 done".
4. **Pins survive; the RECENT section retires.** Pinned documents
   float to a PINNED group at the top of their type's panel; the pin
   chip stays in the document header. Recents remain visible through
   Home's Recently-changed card. Both persist per [[DEC-014]];
   workspace state stays out of `veri/`.

## What changes

- **Sidebar (216px, labeled)** replaces the icon rail and the tree
  sidebar: Home / Requirements / Decisions / Sources / Work Orders /
  Board / Graph, each collection row carrying a type swatch, living
  count, and panel caret; Settings at the foot.
- **Type panel (280px)** with header, live filter input, PINNED group,
  living list, and dead-document expander.
- **Settings area**: gear popover (Project: Templates, Agent
  connection, Project settings · Application: Updates) opening a
  Settings view tab with a sub-nav. WO-024's template settings view
  and WO-007's agent connection panel re-home here unchanged in
  content.

## What does not change

Tabs ([[SRC-004]]), the ⌘K palette, the Home view, Board, Graph, the
topbar, and all document views. The palette remains the fast path;
the panel is the browse path.

## Rejected directions

- **Keeping the icon rail beside a browse panel** — three vertical
  strips before content; the rail's only advantage (density) is moot
  at 216px, and labels beat memorized glyphs.
- **Per-type table views as full tabs** (sortable columns, saved
  filters) — [[SRC-005]]'s deferral stands. A browsing launcher wants
  adjacency to the sidebar and zero tab churn; tables remain future
  work on the same index if a project outgrows the panel.
- **Settings as a topbar menu** — separates configuration from the
  navigation column it governs and collides with the project
  switcher; the sidebar foot is the established quiet corner.
- **Auto-opening the newest document when a panel opens** — turns
  browsing into navigation and clobbers the user's active tab.

## Proposed work order split

Two work orders, independently shippable, in value order — filed
separately on approval:

1. **Labeled sidebar + type panel** — replaces the rail and tree,
   migrates pins to the panel's PINNED group, retires RECENT.
2. **Settings area** — gear popover + Settings view; re-homes the
   template settings view and agent connection panel; adds Project
   settings and Updates sections.
