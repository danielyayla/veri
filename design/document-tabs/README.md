# Handoff: Document Tabs (IDE-style tab workflow)

## Overview
Adds an editor-style tab strip to the Veri desktop app. Opening a requirement, decision, work order, or source no longer replaces the current view — each document opens in its own tab, so users can follow links across the knowledge graph, compare documents, and keep important items open. Board, Graph, Decisions, and Agent connection views open as tabs too.

## About the Design Files
The files in this bundle are **design references created in HTML** (a self-running Design Component prototype), not production code. The task is to **recreate this design in the target codebase's existing environment** (Tauri webview UI — React/Vue/etc., whatever the repo already uses) with its established patterns and state management. Do not ship the HTML directly.

## Fidelity
**High-fidelity.** Colors, typography, spacing, and interaction states are final. Recreate pixel-perfectly using the codebase's existing component patterns.

## Layout
Root: full-viewport column — 44px top bar, then a row of [250px sidebar | editor area].
The editor area is a column: **37px tab strip** on top, active view fills the rest. The tab strip spans only the editor area (VS Code style), not the sidebar.

## Tab strip spec
- Strip: height 37px, background `#131316`, `overflow-x: auto`, tabs left-aligned, a flex-filler on the right carries the strip's 1px `#1E1E24` bottom border.
- Tab (each): flex row, gap 8px, padding `0 8px 0 13px`, max-width 220px, right border 1px `#1A1A1F`, contents:
  1. **Doc id chip** — JetBrains Mono 10px, colored by doc type: REQ `#7EA6C4`, DEC `#CFA83D`, WO `#E8703A`, SRC `#908BA8`. View tabs show a glyph instead (Board ▤, Graph ◉, Decisions §, Agent connection ⌁) in `#8B8893`.
  2. **Title** — Source Sans 3, 12.5px, ellipsized at 130px. Active `#E7E4DE`, inactive `#8B8893`. *Italic when the tab is a preview tab.*
  3. **Close ×** — 16×16, radius 4px; `#55525E` (active tab) / `#3F3D47` (inactive); hover: background `#26262C`, color `#E7E4DE`.
- Active tab: background `#0F0F11` (merges with content below), 2px inset top accent `#E8703A`, no bottom border.
- Inactive tab: transparent background, 1px `#1E1E24` bottom border (continues the strip line).
- Tooltip on hover: `REQ-002 — PDF export with templates`, plus `· preview — double-click to keep open` for preview tabs.

## Interactions & Behavior
Core rules (VS Code semantics):
1. **Links open new pinned tabs.** Clicking an inline `[[DOC-ID]]` chip in a document body, or a card in the Connections side panel, opens the target in a new tab **inserted immediately after the active tab** and focuses it. The source document's tab stays open.
2. **Already open → focus, never duplicate.** If the target doc has a tab, focus it (and pin it if it was a preview).
3. **Browsing uses a single preview tab.** Single-click in the sidebar tree, board cards, graph "Open doc", decision-log entries, and veri-check issues opens as a *preview* tab (italic title). At most one preview tab exists; the next preview click **reuses/replaces it in place**. Double-clicking a preview tab pins it. Opening a link from inside a preview doc pins the resulting tab (rule 1 tabs are always pinned).
4. **Background open:** ⌘/Ctrl-click any doc link opens the tab without focusing it.
5. **Close:** × click or middle-click anywhere on the tab. Closing the active tab activates the right neighbor, else the left one.
6. **Reorder:** HTML5 drag — live reorder while dragging over sibling tabs.
7. **Views as tabs:** Board / Graph / Decisions / Agent connection open as (preview) tabs via the sidebar nav. The "Documents" nav item focuses the most recent document tab, or opens REQ-002 as preview if none.
8. **Empty state:** all tabs closed → centered message: mono label `NO OPEN TABS` (`#55525E`) + "Pick a document from the sidebar or press ⌘K to search" (`#6E6B76`), ⌘K rendered as a bordered key chip.
9. Sidebar active-row highlight tracks the **active tab** (`rgba(232,112,58,0.08)` row background).

Recommended (not in prototype): ⌃Tab / ⌃⇧Tab cycling, ⌘W close, persist open tabs per project across restarts.

## State Management
- `tabs: Array<{ id: string, preview: boolean }>` — ordered; ids are doc ids (`REQ-002`) or view keys (`board`, `graph`, `decisions`, `mcp`).
- `activeTabId: string | null`.
- Operations: `openTab(id, {preview, background})` (implements rules 1–4), `closeTab(id)` (rule 5), `pinTab(id)`, `reorder(from, to)`.
- A settings flag `previewTabs: boolean` (default true) disables preview semantics — every click then opens a pinned tab.
- Per-tab scroll position should be preserved when switching tabs (not in the prototype; expected in production).

## Design Tokens
- Backgrounds: app `#0F0F11`, panels/strip `#131316`, cards `#151519`/`#17171B`
- Borders: `#1E1E24` (structure), `#26262C` (controls), `#1A1A1F` (tab separators)
- Text: primary `#E7E4DE`, body `#C9C6CF`, secondary `#A09DA6`, muted `#8B8893`/`#6E6B76`, faint `#55525E`
- Accent: orange `#E8703A`; type colors: REQ `#7EA6C4`, DEC `#CFA83D`, WO `#E8703A`, SRC `#908BA8`; warn `#D9A03F`; ok `#7FAF8A`
- Fonts: Source Sans 3 (UI), JetBrains Mono (ids, meta, keycaps)
- Radii: 4px chips/keys, 6–8px controls/cards

## Assets
None — all glyphs are unicode characters (▤ ◉ § ⌁ ×), no icon assets.

## Files
- `Veri Tabs.dc.html` — the tabbed prototype (this design). Open in a browser; tab logic lives in the embedded `Component` class (`openTab` / `closeTab` / `pinTab` / `resolve`), tab strip markup is the `{{ tabs }}` loop near the top of the editor area.
- `Veri.dc.html` — prior single-view version, for diffing what changed.
