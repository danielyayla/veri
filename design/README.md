# Handoff: Veri Desktop UI

## Overview
Design for Veri's desktop app — a local-first viewer/editor for a `veri/`
knowledge base (requirements, decisions, work orders, sources) with a
Context Package panel that previews exactly what an MCP-connected coding
agent receives. Five screens in one shell: Project home, Work order
detail, Board, Graph, Decision log.

## About the Design Files
`design-mockup.html` is a **design reference created in HTML** — a
self-contained interactive prototype showing intended look and behavior,
not production code to copy. The task is to **recreate it in the target
environment** (choose and file the framework as a new DEC per repo
conventions), backed by `packages/core` for all real data. The mockup's
demo dataset ("skiff", an invoicing app) is illustrative fixture content —
real screens render live `veri/` files.

## Fidelity
**High-fidelity.** Colors, typography, spacing, and interactions are
final. Recreate pixel-perfectly.

## How this bundle maps into the repo
- `design-mockup.html` + this README → `design/` at the repo root
  (replaces the stale Kiln-era `design-mockup.html`)
- `veri/sources/SRC-001-design-mockup.md` → replaces the existing SRC-001
  (v2 update: rename + new file location)
- `veri/requirements/REQ-004-desktop-ui.md` → new requirement (draft;
  review then set `accepted`)
- `veri/work-orders/WO-005-desktop-ui.md` → new work order (backlog)

Then run `veri check` and start the work order the normal way:
`get_context("WO-005")`.

## Design Tokens

Colors (dark theme only):
- Background base `#0F0F11`; panels/topbar/sidebar `#131316`; cards
  `#151519`–`#18181D`; popovers `#1A1A1F`
- Borders: hairlines `#1E1E24`, card borders `#1F1F24`/`#24242B`,
  interactive borders `#26262C`, hover `#2E2E36`–`#3A3A44`
- Text: primary `#E7E4DE`, body `#C9C6CF`, secondary `#A09DA6`, muted
  `#8B8893`, faint `#6E6B76`, ghost `#55525E`/`#4A4852`
- Accent (ember): `#E8703A`; hover/lighter `#F0A87E`; links `#E8703A`,
  link hover `#F49463`
- Type colors: requirement `#7EA6C4` (blue), decision `#CFA83D` (gold),
  work order `#E8703A` (ember), source `#908BA8` (violet-grey)
- Status: success/done/active `#7FAF8A`; warning/health/superseded
  `#D9A03F`; in-progress `#E8703A`
- Tinted chip backgrounds: the chip's color at 10% alpha, e.g.
  `rgba(126,166,196,0.1)`; warning surfaces `rgba(217,160,63,0.07–0.08)`
  with border `#3A3020`

Typography:
- Prose: "Source Sans 3" (400/500/600/700). Body 14–14.5px / 1.65;
  doc titles 24px/600; screen titles 20px/600; section headings 15px/600;
  card titles 13.5px/500
- Mono (IDs, frontmatter, timestamps, badges, kbd): "JetBrains Mono"
  (400/500/600). IDs 10.5–12px; section labels 10px, letter-spacing .1em,
  uppercase; badges 10–11px
- Every document ID, status badge, date, and token count is mono; all
  prose is sans

Spacing & shape:
- Radii: buttons/inputs/nav rows 6–7px; cards 8–9px; columns/graph canvas
  10–12px; chips 4px
- Topbar 44px; sidebar 250px; right panels 300px (Connections) / 340px
  (Context Package); reader column max-width 720–740px, padding 30px 40px
- Row heights: nav 28px, tree rows 26px, frontmatter rows 28px
- Shadows: popovers only — `0 12px 32px rgba(0,0,0,.5)`; no card shadows

## Screens / Views

### Shell (all screens)
- Topbar: logo glyph (18px ember square, radius 4, mono "v"), wordmark
  "Veri" 13px/600, `/` separator, project name in mono 12px `#A09DA6`.
  Center: 340px search affordance (border `#26262C`, bg base, "Search
  docs…" + `⌘K` kbd chip). Right: health chip ("veri check · 2 issues",
  warning tint, opens issue popover listing each issue with doc ID +
  message, click navigates) and git chip ("⎇ main · clean", mono).
- Sidebar: nav (Documents ≡ / Board ▤ / Graph ◉ / Decisions §; active row
  ember-tinted bg `rgba(232,112,58,0.09)` + `#F0A87E` text), hairline
  divider, then the doc tree grouped by type: group header = 7px square
  swatch in type color + uppercase mono label + count; rows = mono ID in
  type color + sans title, ellipsized; amber 5px dot on docs with health
  issues; green ✓ on done WOs; active row ember-tinted.
- Sidebar footer: pulsing green dot + `mcp · serving on :7423` (mono 10px).

### 1. Project home (three panes)
- Center reader: breadcrumb (mono, type-colored ID) → 24px title →
  optional warning banner ("⚠ veri check" + message) → frontmatter
  properties card (label column 110px mono faint; values as text or
  tinted chips for type/status) → markdown body (15px/600 h2s; 14.5px
  body; `[[ID]]` links as mono type-colored tinted chips, clickable;
  broken links amber with dashed underline + tooltip; acceptance criteria
  as 15px checkboxes — filled green with ✓ when done, checked items'
  text dimmed) → ACTIVITY section (mono label; rows = dot (ember for
  agent, grey for human) + optional mono "agent" tag + text + relative
  time right-aligned).
- Note input at bottom (mono, 34px, focus border `#8A4A2C`): typing `[[`
  opens an autocomplete popover above it (ID + title rows, click inserts
  `[[ID]] `).
- Right panel CONNECTIONS: grouped cards "Outbound · links to" /
  "Inbound · linked from" with counts; each card = ID (type color) +
  type label (right, faint) + title + relationship note.

### 2. Work order detail
- Header: breadcrumb, title + 3-segment status control (backlog / in
  progress / done; mono 11px, active segment tinted in its status color),
  meta row (created / updated / branch in mono).
- When status = done, a **Receipt** card appears above the body: green
  border `#24382B`, bg `rgba(127,175,138,0.06)`, "✓ Receipt" + timestamp,
  commit SHA as a mono chip, session line, per-file diff list (mono,
  green +N / blue "new"), one-line summary.
- Body: Summary, In scope, Out of scope (muted `#8B8893`), Linked
  requirements (expandable card: chevron, ID, title, status right; expands
  to acceptance criteria), Linked decisions (same pattern, rationale text
  when expanded), Acceptance tests (checkbox list, done items dimmed),
  ACTIVITY feed.
- Right panel CONTEXT PACKAGE (340px): header + ember total "~12.0k
  tokens"; doc list card on base bg — each row: type swatch, mono ID in
  type color, title, per-doc token estimate right; footer note "assembled
  fresh from current doc versions / git main @ SHA". Buttons: primary
  **Copy for agent** (ember bg, dark text; flips to green-tinted
  "✓ Copied" ~1.8s) and secondary **Serve via MCP** (outlined; toggles a
  snippet card: `veri.get_context("WO-002")`, `mcp://localhost:7423 ·
  live`). Below: PACKAGE RULES paragraph (12px muted).

### 3. Board
- Title + count. 3 columns (grid, 240–320px each, gap 14): column header
  = status dot + uppercase mono label + count; cards = mono ember ID,
  optional `⌁ agent` chip (ember tint) or amber health dot top-right,
  13.5px title, footer "N linked REQs" (mono; **amber when 0**). Cards
  click through to the doc/WO.

### 4. Graph
- Title + right-aligned legend (dot + mono label per type). Full-bleed
  canvas card (`#111114`): SVG edge lines (`#26262C`, highlighted edges
  ember) under absolutely-positioned nodes — circle sized by degree
  (10–22px), filled in type color, mono ID label below; superseded nodes
  at 45% opacity. Click selects: node ring lights, its edges turn ember,
  and a 230px popover shows ID, type, title, "N links · status", and an
  "Open doc →" button. Click again deselects.

### 5. Decision log
- Single column, max 680px. One card per decision, newest first: header
  (gold mono ID, date, status badge right — green "active" / amber
  "superseded"), 15px title, choice sentence, REJECTED row (mono
  micro-label + struck-through bordered chips), LINKS row (tinted
  type-colored ID chips). Superseded cards at 55% opacity with a
  "↪ superseded by DEC-XXX" pointer (amber, clickable).

## Interactions & Behavior
- All navigation is instant view swaps, no route transitions; clicking any
  ID chip/card opens that document.
- Hover states: rows tint to `#1B1B20`; cards lighten border; buttons
  brighten ~10%. No motion except the MCP dot pulse (3s opacity ease).
- Health indicators appear only when issues exist; the topbar chip count
  matches the number of issue rows.
- Agent activity rows are distinguished by the ember dot + mono "agent"
  prefix — visually quiet, no banners.

## State Management
- Per-doc: expanded/collapsed linked cards; WO status; graph selection;
  autocomplete query; copy-button flash; MCP snippet toggle.
- App: current view, current doc ID, health issue list (from `veri
  check`), activity log per doc. All derived from files + core library.

## Assets
None — no images or icon fonts. Glyphs are unicode text (≡ ▤ ◉ § ⌁ ⎇ ✓).
Fonts from Google Fonts: Source Sans 3, JetBrains Mono (bundle locally
for the no-network requirement).

## Files
- `design-mockup.html` — the full interactive prototype (all five screens,
  switch via sidebar; set a WO to "done" to see the receipt; type `[[` in
  the home note field for autocomplete; click the health chip)
- `veri/` — drop-in knowledge-base documents (REQ-004, WO-005, SRC-001 v2)
