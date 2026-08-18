# Handoff: Sidebar Navigation (SRC-014)

## Overview
Consolidates the desktop app's primary navigation: the 44px icon rail
and the working-set sidebar merge into **one labeled sidebar** (Home,
the four document collections, Board, Graph), a **secondary type panel**
that opens beside it to browse all documents of the selected type, and a
**Settings area** at the sidebar foot that re-homes the
configuration-oriented surfaces (Templates, Agent connection) out of
primary navigation.

This is the design doc that SRC-005 deferred under "per-type list
views" — it delivers that browsing surface as a panel rather than a
table view, and revises SRC-005's layer 3 (icon rail + working-set
sidebar) while keeping layers 1, 2, and 4 (tabs, palette, Home)
untouched.

**Status: proposed — awaiting Daniel's approval.** Do not implement
until SRC-014 carries the approval stamp.

## About the Design Files
`Veri Sidebar Nav.html` is a **design reference created in HTML** — a
self-contained interactive prototype (open directly in a browser), not
production code. Recreate it in `packages/ui` with the codebase's
established patterns, backed by `packages/core` for all real data. The
prototype's dataset is this repo's own `veri/` knowledge base as of
2026-08-18, embedded as fixture data.

## Fidelity
**High-fidelity.** Colors, typography, spacing, and interaction states
are final. Tab-strip behavior is unchanged from the document-tabs
handoff; palette and Home view are unchanged from the navigation-model
handoff — those specs still apply.

## Non-negotiable principles
- Carried over from SRC-005: pins and recents are **workspace state**
  (Electron userData per project, DEC-014), lifecycle filtering — not
  hierarchy — keeps lists small, and all browsing surfaces open
  **preview tabs** (document-tabs semantics; double-click pins).
- The type panel is a **browser, not a route**: opening it never changes
  the active tab. Only clicking a document does.
- Settings owns configuration; primary nav owns work. Nothing
  configuration-shaped returns to the sidebar.

## Layout
Root: full-viewport column — 44px topbar, then a row of
[**216px sidebar** | **280px type panel** (when open) | editor area
(37px tab strip + active view)]. The icon rail is gone.

## Sidebar (216px)
Background `#101013`, right border 1px `#1E1E24`, padding 10px 8px.
Rows are 28px, radius 6px, 13px Source Sans 3; hover `#1B1B20`; active
`rgba(232,112,58,0.09)` with text/glyph `#F0A87E`.

Order, top to bottom, with 1px hairline dividers between groups:

1. **Home** — glyph ⌂ (JetBrains Mono 13px, 16px column, `#8B8893`).
2. **Collections**: Requirements, Decisions, Sources, Work Orders. Row
   anatomy: 7px type-color square swatch (radius 2px, in the 16px glyph
   column) · label · **living count** (mono 10.5px `#55525E`) · caret
   ▸/◂ (9px) indicating panel state. Living = REQ `draft`/`accepted`,
   DEC `active`, WO `backlog`/`in-progress`, SRC all.
3. **Board**, **Graph** — glyphs ▤ ◉.
4. Flex filler, then **Settings** — glyph ⚙︎, plus a 6px agent-status
   dot right-aligned (`#7FAF8A` healthy / `#D9A03F` otherwise, 3s pulse)
   so connection health stays glanceable with the rail gone.

Clicking a view row opens that view as a preview tab and closes the
type panel. Clicking a collection toggles its panel (click again to
close); it does not change the active tab.

## Type panel (280px)
Background `#131316`, right border 1px `#1E1E24`. Closes via the ✕, by
re-clicking the active collection, or by selecting any view row.

- **Header**: 8px type swatch · uppercase mono 10.5px label
  (letter-spacing .1em, `#A09DA6`) · total count (mono, `#55525E`) · ✕.
- **Filter input**: 27px, mono 11px, background `#0F0F11`, border
  `#26262C`, focus border `#8A4A2C`. Autofocused when the panel opens.
  Filters id + title, live, across living and dead rows.
- **List**, grouped: **PINNED** (★ `#E8703A` prefix; only when pins of
  this type exist) → **ALL** (living documents, newest id first) → a
  dimmed expander for dead documents ("▸ 30 done" / "▸ 2 superseded",
  11.5px `#55525E`, toggles to "▾ hide done"), expanding in place.
- **Row**: min-height 28px, radius 6px — mono 10px id in type color
  (52px column) · 12.5px title `#A8A5AF`, ellipsized · status (mono 9px,
  status color; `done` at 60% opacity). Hover `#1B1B20`; the row of the
  active tab's document carries the ember active tint.
- Click opens the shared preview tab; double-click pins.
- Empty filter state: "No matches for “query”."

**Pinning:** the pin action is a bordered chip in the document header
(`☆ Pin` `#8B8893` / `★ Pinned` `#E8703A`, mono 10.5px) and belongs in
the tab context menu in production. Pinned documents float to the
panel's PINNED group; recents live on Home's Recently-changed card. The
old sidebar's RECENT section is retired.

## Settings
The gear row opens a **popover menu** (above the row: `#1A1A1F`,
border `#2B2B32`, radius 8px, shadow `0 12px 32px rgba(0,0,0,.5)`),
grouped by uppercase mono labels:

- **PROJECT**: Templates ⌧ · Agent connection ⌁ (green dot + `:7423`
  meta) · Project settings ▣
- **APPLICATION**: Updates ↻ (version meta) · future rows (Appearance
  shown as "soon")

Each item opens the **Settings view** — a view tab like Board (one
instance, closeable, preview semantics) — at that section. The view is
a 190px sub-nav (same row grammar as the sidebar) beside a 620px
max-width body:

- **Templates** — the four `veri/templates/*.md` files: type swatch,
  mono path, "customized"/"default" note, Edit button. (Re-homes the
  WO-024 template settings view.)
- **Agent connection** — live status card (green-tinted, `mcp · :7423 ·
  live`), client + config rows, connection snippet. (Re-homes the
  WO-007 agent connection panel; the rail's ⌁ entry is retired.)
- **Project settings** — name, path, format marker, workflow doc.
- **Updates** — version, channel, update status (WO-028 surfaces).

## State Management
- `panel: type | null`, `filter: string`, `showDead: {type: bool}` —
  session state, not persisted.
- `pinned: string[]` — persists in the DEC-014 workspace-state JSON
  (drop the `recents` consumer in the sidebar; Home still reads it if
  needed).
- `settings: { section }` — session state; the settings popover is
  transient.
- Tabs, palette, and Home state are unchanged from their handoffs.

## Design Tokens
Same palette as the navigation-model handoff. No new colors; the only
new patterns are the settings popover (existing popover tokens) and the
green status card `rgba(127,175,138,0.06)` / border `#24382B` (existing
receipt-card tokens). Fonts: Source Sans 3 (UI), JetBrains Mono (ids,
counts, labels, keycaps).

## Explicitly deferred
- Sortable/filterable **table views** per type (SRC-005's deferral
  stands — the panel is a launcher, not a table).
- Drag-reorder of pins in the panel (production nicety; prototype
  omits it).
- Appearance settings (placeholder row only).

## Assets
None — all glyphs are unicode (⌂ ▤ ◉ ⚙︎ ⌁ ⌧ ▣ ↻ ★ ☆ ✕ ⌕ ⎇). Fonts
are embedded in the prototype as data URIs; production bundles them
locally per the no-network requirement.

## Files
- `Veri Sidebar Nav.html` — the interactive prototype. Click
  collections to open the type panel, ☆ Pin in any document header,
  the gear for the settings menu, ▸ expanders for dead documents.
  Published copy: https://claude.ai/code/artifact/245364d4-1397-4eb0-aefc-60e55c5dc25d
- See `design/navigation-model/` (palette, Home — still authoritative)
  and `design/document-tabs/` (tab semantics, unchanged).
