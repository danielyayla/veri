# Handoff: Navigation Model at Scale (SRC-005, layers 2–4)

## Overview
Implements the approved navigation design from **SRC-005** on top of the shipped tab workflow (WO-012 / `design_handoff_document_tabs`): a **⌘K command palette**, a **working-set sidebar** (pinned + recent + lifecycle-filtered tree) behind a **44px icon rail**, and a **Home view** that answers "what needs attention". Keeps navigation usable as a project grows from dozens to hundreds of documents.

Per SRC-005, implement as **three independently shippable work orders**, in value order:
1. Command palette (depends only on the shared search library, DEC-009)
2. Sidebar working set + live filtering (includes userData persistence for pins/recents)
3. Home view

Before implementing each, pull its context package: `get_context("WO-###")` via the Veri MCP tools.

## About the Design Files
The files in this bundle are **design references created in HTML** (a self-running Design Component prototype), not production code. Recreate this design in the target codebase's existing environment (Tauri webview UI, whatever framework the repo uses) with its established patterns. Do not ship the HTML directly.

## Fidelity
**High-fidelity.** Colors, typography, spacing, and interaction states are final. Recreate pixel-perfectly using the codebase's existing component patterns. Tab-strip behavior is unchanged from the document-tabs handoff — that spec still applies.

## Non-negotiable principles (from SRC-005)
- Pins, recents, and open tabs are **workspace state** — persist in Electron/Tauri userData per project, never in `veri/`.
- Sidebar subfolders (if the user organizes `veri/requirements/auth/…`) render in the tree but **mean nothing** — folder position is presentation-only.
- Search reuses the MCP server's index through the shared library (DEC-009) — no second index.
- Lifecycle filtering, not hierarchy, is what keeps the sidebar small.

## Layout
Root: full-viewport column — 44px top bar, then a row of [**44px icon rail** | 250px sidebar | editor area (37px tab strip + active view)].

## Icon rail (left edge, 44px)
- Column, background `#101013`, right border 1px `#1E1E24`, padding 10px 0, items centered, 5px gap.
- One 32×32 button per view, radius 7px, JetBrains Mono 14px glyph: Home ⌂, Board ▤, Graph ◉, Decisions §. Hover background `#1B1B20`.
- Active view: background `rgba(232,112,58,0.09)`, glyph `#F0A87E`; inactive glyph `#C9C6CF`.
- Bottom (after flex filler): Agent-connection button ⌁ in `#8B8893` with a 6px status dot overlaid top-right (`#7FAF8A` healthy / `#D9A03F` otherwise, 1px `#101013` ring). Opens the Agent connection view tab.
- **Tooltips: custom, instant** (not native `title` — its ~1s delay hurts icon-only nav). On hover: label to the right of the icon at `left: 40px`, vertically centered; background `#1F1F25`, 1px `#2B2B32` border, radius 6px, padding 4px 9px, Source Sans 3 11.5px `#E7E4DE`, shadow `0 6px 18px rgba(0,0,0,.4)`, `pointer-events: none`. Appear immediately on mouseenter (production may add a ~150ms show delay and instant subsequent shows, VS Code-style).
- Clicking a rail item opens that view as a **preview tab** (document-tabs rules apply).

## Command palette (⌘K)
Floating overlay — never a tab. Scrim `rgba(8,8,10,0.55)`, panel 580px wide (max 90vw), top-aligned 104px down; background `#17171B`, 1px `#2B2B32`, radius 11px, shadow `0 28px 80px rgba(0,0,0,.65)`.

- **Input row**: 44px, ⌕ glyph, borderless input (Source Sans 3, 14px), `esc` keycap chip right. Autofocused on open.
- **Results list**: max-height 400px, scroll, 6px padding. Row: id chip (JetBrains Mono 10.5px, type color on type-tint background, radius 4px, min-width 52px, centered) · title (13.5px `#E7E4DE`, ellipsized) · status (mono 10px, status color) · optional dimmed match snippet under the title (11.5px `#6E6B76`, one line). Selected row: background `#1F1F25` + `↩` hint at right. Mouse hover moves selection.
- **Footer**: `↑↓ navigate · ↩ open · ⌘↩ open pinned tab` left; filter grammar reminder right (mono 10px `#55525E`).
- **Matching, ranked**: exact id (case-insensitive, zero-padding optional — `req14` → REQ-014) → id prefix → title starts-with → title contains → full-text body match (renders the snippet). Recently opened docs get a rank boost. Top 8 shown.
- **Filters** as typed prefixes, composable: `req:` `dec:` `wo:` `src:` (type), `is:done` `is:active` `is:backlog` (status; `is:active` means living). Prefixes are stripped from the free-text query.
- **Views are rows too** (typing `board`, `home`, `graph`, `decisions`, `agent` surfaces the view; suppressed while a type/status filter is active). View rows show the glyph as their chip and a muted `view` badge.
- **Open semantics** (mirrors document tabs): Enter / click → shared preview tab, palette closes. ⌘Enter / ⌘click → pinned tab in background, palette stays open. Esc closes. ⌘K toggles. The topbar "Search docs… ⌘K" field is a click target that opens it.
- Empty state: "No matches — try an id, title text, or a filter like `wo: is:backlog`".

## Sidebar (250px)
One scrolling pane, sections top to bottom — no modes.

1. **PINNED** — user-starred docs. Row: id (mono 10px, type color) + title (12.5px `#A8A5AF`) + `✕` unpin on the right (`#3F3D47`, hover `#A09DA6`). Hidden when empty. (Prototype omits drag-reorder; production: manual drag order.)
2. **RECENT** — last 8 opened documents, most recent first, excluding pinned ones. Same row minus unpin. Updated on every doc open.
3. Divider (1px `#1E1E24`), then **the tree**, grouped by type (REQUIREMENTS / DECISIONS / WORK ORDERS / SOURCES). Section header: 7px type-color square chip + mono 10px label + **living count** right; header click collapses/expands the section.
   - **Live-by-default**: sections list only living docs — REQ `draft`/`accepted`, DEC `active`, WO `backlog`/`in-progress`. A dimmed footer row ("2 done", "1 superseded" — 11.5px `#55525E`, ▸/▾ chevron, hover `#8B8893`) expands that section in place to show all; expanded state relabels to "hide done" etc. Done/superseded rows carry a `✓` (`#5A7F64`).
   - **SOURCES**: no lifecycle — shows all, but **collapsed by default**.
   - Row anatomy, active-row highlight, and health dots unchanged from the document-tabs handoff. All sidebar clicks open preview tabs.
- Sidebar footer: agent-connection strip only when the rail is disabled (rail owns it otherwise).
- **Pin action** also lives in the document header: bordered chip right of the title — `☆ Pin` (`#8B8893`) / `★ Pinned` (`#E8703A`) — and belongs in the tab context menu in production.

## Home view
Default tab on project open; a view tab like Board (closeable, one instance, reachable from rail + palette). Max-width 920px, centered; `h1` project name + mono doc count; then a 2×2 grid (14px gap) of cards (1px `#1E1E24`, radius 10px, background `#131316`; header row: mono 10px letter-spaced label + right-aligned meta; rows separated by 1px `#17171B`, hover background `#17171B`, every row opens its doc as preview):

1. **HEALTH** — `veri check` output. Row: issue-kind chip (mono 9.5px `#D9A03F`, 1px `#3A3020` border) + doc id + message. Header meta: issue count. The topbar `veri check` chip deep-links here.
2. **IN FLIGHT** — work orders in backlog/in-progress: id (`#E8703A`) · title · ⌁ agent marker (when a session is attached) · linked-REQ count (amber `#D9A03F` when 0) · status (right, status color).
3. **AGENT ACTIVITY** — project-wide write-back feed (context pulls, filed decisions, receipts), newest first: doc id (type color, 52px col) · text (`#A09DA6`) · relative time (right).
4. **RECENTLY CHANGED** — docs by `updated` desc: id · title (`#C9C6CF`) · relative time.

## State Management
- `palette: { open, query, selectedIndex }` — parse filters from the query; global ⌘K listener; ↑/↓/Enter/⌘Enter/Esc handled while open.
- `pinned: string[]`, `recents: string[]` (cap ~10) — **persist per project in userData**; recents updated in `openTab`.
- `sidebar: { sectionCollapsed: {type: bool}, showDead: {type: bool} }` — session state; SOURCES collapsed by default.
- Tabs state unchanged from document-tabs handoff; `homeview` is a view key like `board`.
- Search: call the shared library (DEC-009); ranking as specified above.

## Design Tokens
Same palette as the document-tabs handoff, plus: rail background `#101013`; tooltip/selected-row background `#1F1F25`; palette panel `#17171B`, scrim `rgba(8,8,10,0.55)`.
- Backgrounds: app `#0F0F11`, panels `#131316`, cards `#151519`/`#17171B`
- Borders: `#1E1E24`, `#26262C`, popover `#2B2B32`
- Text: `#E7E4DE` primary, `#C9C6CF` body, `#A09DA6`/`#8B8893`/`#6E6B76` secondary→muted, `#55525E` faint
- Accent `#E8703A`; type colors REQ `#7EA6C4` / DEC `#CFA83D` / WO `#E8703A` / SRC `#908BA8`; warn `#D9A03F`; ok `#7FAF8A`
- Fonts: Source Sans 3 (UI), JetBrains Mono (ids, meta, keycaps)

## Explicitly deferred (do not build)
Per-type list views, area/epic metadata, timeline view, tab persistence across restarts, graph-view expansion. Each waits for its own design doc.

## Assets
None — all glyphs are unicode (⌂ ▤ ◉ § ⌁ ⌕ ★ ☆ ✕ ↩), no icon assets.

## Files
- `Veri Nav.dc.html` — the prototype. Open directly in a browser. Palette logic sits in `renderVals()` under `// command palette`; sidebar tree under `treeGroups`; Home under `// home overview`. A `navLayout` prop shows the rejected layout alternatives (`list`, `topbar`, `iconrow`) — **`rail` is the approved design**.
- `support.js` — prototype runtime (ignore).

See also: `design_handoff_document_tabs/` (tab semantics this builds on) and the SRC-005 source document in `veri/` for rationale and rejected directions.
