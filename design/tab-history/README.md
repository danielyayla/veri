# Handoff: Tab history and the visible working set (WO-039)

## Overview
Gives every tab a back/forward history so the core reading act —
following a trail SRC → REQ → DEC → WO — becomes reversible, and makes
the working set visible: the persisted recents render in the sidebar and
the type crumb becomes live. Delivers [[REQ-016]]; implemented by
[[WO-039]].

## About the design files
This bundle is a **written spec only** — no HTML prototype. The visual
surface is three small additions on existing tokens (two chevron
buttons in the tab strip, one sidebar group, one hover state on the
crumb); the substance of the design is behavioral, specified precisely
below. Recreate in `packages/ui` with the codebase's established
patterns (`tabs.ts` pure ops + app-shell rendering).

## Fidelity
**High-fidelity for behavior** — the gesture table and history rules
are final. Visual details reuse the existing token palette exactly;
measurements below are final.

## What this supersedes (the one real design decision)

Per-tab history cannot be bolted onto SRC-004's model, where a tab's
identity *is* its document and clicking a link spawns a new pinned tab
— a tab whose content never changes has no history. This design keeps
SRC-004's strip, preview tab, and ⌘-click semantics, but moves link
navigation to the Obsidian/browser model:

- **Supersedes SRC-004 rule 1** ("links open new pinned tabs"): a plain
  click on a link now navigates the **current tab in place**, pushing a
  history entry. The keep-both-open workflow moves to ⌘-click
  (unchanged: new background tab).
- **Supersedes SRC-004 rule 2 for documents** ("already open → focus,
  never duplicate"): in-place navigation never hunts for another tab,
  so the same document may show in two tabs (as in Obsidian and every
  browser). **View tabs stay singletons** (Board, Graph, Decisions,
  Settings, Home).
- **Supersedes the auto-pin clause of SRC-004 rule 3** ("opening a link
  from inside a preview doc pins the resulting tab"): navigation never
  changes pinned-ness. The preview tab stays a preview while you follow
  a trail through it; double-click or edit still pins.

Everything else in SRC-004 stands: the strip layout and tab anatomy,
the single reusable preview tab for browsing surfaces, ⌘-click
background opens, close/reorder/cycle, the empty state. SRC-014's
sidebar and type panel stand, except its "RECENT section is retired"
clause, reversed below on the evidence of SRC-016 (context preservation
scored 2/5).

## The model: a tab is a history surface

```
Tab {
  key: string          // stable identity, assigned at creation
  preview: boolean
  entries: Array<{ target: string, scroll: number }>  // doc id or view key
  index: number        // current entry
}
```

The strip renders each tab from `entries[index]`: id chip / view glyph,
title, tooltip — all as SRC-004 specifies, driven by the current entry.
The sidebar active-row tint and the type panel's active-row tint track
the active tab's current entry.

## Gesture table

| Gesture | Result |
|---|---|
| Plain click: body `[[id]]` chip, Connections card, palette ↩ | Navigate the **active tab** in place — push entry, truncate forward |
| Plain click: type-panel row, board card, graph "Open doc", decisions row, Home rows | Navigate the **shared preview tab** in place (create it if none), focus it — push entry on that tab |
| ⌘-click any of the above | New **background pinned** tab seeded with one entry (SRC-004 rule 4, unchanged) |
| ⌘-click a `[[link]]` in the CM6 editor (edit mode) | Navigate the active tab in place — the editor's follow gesture; plain click keeps moving the cursor |
| ⌘⌥-click in the CM6 editor | New background pinned tab |
| Double-click preview tab / start editing | Pin (unchanged) |
| ⌘[ / ⌘] (Windows/Linux: Alt+← / Alt+→) | Back / forward in the **active tab** |
| ‹ › strip buttons | Same as ⌘[ / ⌘] |

A view row in the sidebar (Board, Graph, …) focuses the tab currently
*showing* that view if one exists, else opens it in the preview tab
(push). Views may appear in back-history of any tab; the singleton rule
applies only to current entries.

## History rules

1. **Push** replaces `entries[index+1..]` (browser-style truncation —
   a new navigation from mid-history drops the forward stack).
2. Navigating to the target already current in that tab is a no-op
   (no duplicate consecutive entries).
3. **Cap 50 entries per tab**; pushing past the cap drops the oldest.
4. **Scroll**: leaving an entry (navigation, back/forward, or tab
   switch) captures the content scroll position into the entry;
   arriving restores it. Replaces the current per-tab-id scroll map.
5. History is **session state, in memory only** — never persisted,
   never written into `veri/` or the DEC-014 workspace file (which
   keeps exactly its current shape: pinned + recents).
6. A document deleted on disk drops out of history: entries whose
   target no longer resolves are removed on snapshot refresh (a tab
   left with zero entries closes, as its doc-tab equivalent does
   today).

## Back/forward buttons

Leftmost in the 37px tab strip, before the first tab: two 24×24
buttons, JetBrains Mono ‹ and ›, radius 4px, centered in a 4px-padded
group. Enabled `#8B8893`, hover background `#26262C` color `#E7E4DE`;
disabled `#3F3D47` (no hover). Disabled states: ‹ when `index == 0`,
› when `index == entries.length - 1`. Tooltips "Back ⌘[" / "Forward
⌘]". They act on the active tab; hidden in the no-tabs empty state.

## Editor interplay

Editor buffers (SRC-008 islands) stay keyed by document id, not by
tab. Navigating away from a doc in edit mode keeps its buffer, mode,
and dirty state; going back re-shows the editor exactly as left. A
dirty buffer is never silently dropped: closing the last tab whose
*history* still references a dirty doc triggers the existing
Save / Discard / Cancel prompt (once per dirty doc, sequentially).
Clean buffers are released when no tab's current entry shows the doc.

## Sidebar RECENT group

Between Graph and the flex filler, under a hairline divider — the
working-context group REQ-016 requires, reversing SRC-014's retirement
of it:

- Header: `RECENT`, uppercase JetBrains Mono 9.5px, letter-spacing
  .08em, `#55525E`, 6px bottom margin.
- Rows: newest-first, **cap 6**, min-height 24px, radius 6px, padding
  matching sidebar rows. Anatomy: mono 10px id in its type color
  (no fixed column — inline, 6px gap) · 12.5px Source Sans 3 title
  `#A8A5AF`, ellipsized. Hover `#1B1B20`; the row of the active tab's
  current doc carries the ember active tint
  (`rgba(232,112,58,0.09)`, text `#F0A87E`).
- Click = preview open (browsing surface, per the gesture table);
  ⌘-click = background pinned tab.
- Source: the DEC-014 persisted recents, filtered to docs that still
  exist. The group is **hidden entirely when empty** (fresh project).
- The data pipeline is untouched: every doc open still pushes recents
  (cap 10 persisted); the palette's recency boost reads the same list
  (out of scope to change, per WO-039).

## Live type crumb

In the crumb row `Requirements / REQ-008` (reader, work-order, and
editor screens), the type segment becomes interactive: cursor pointer,
hover color `#C9C6CF`, click **opens that type's panel** (the SRC-014
type panel — a browser, not a route: the active tab does not change).
Tooltip "Browse requirements". The `/` separator and id segment are
unchanged. The Workflow crumb stays inert (no workflow panel exists).

## State management

- `tabs.ts` grows the entry/index shape above; `openTab` becomes
  `navigate(state, target, { surface: 'inplace' | 'preview' |
  'background' })` plus `back`, `forward` — all pure, unit-tested like
  the current ops. `closeTab`, `pinTab`, `activateTab`, `reorderTab`,
  `cycleTab`, `retainTabs` keep their semantics (retainTabs prunes
  entries per history rule 6).
- Recents and pins: unchanged (DEC-014 JSON, loaded at boot, saved on
  change).
- Nothing new is persisted.

## Explicitly deferred
- Pinned documents in the working set (REQ-016 names them; WO-039
  excludes them — own design pass).
- Split views, hover link previews, history dropdown on long-press of
  ‹ › (browser nicety; add later without breaking this model).
- Persisting open tabs/history across restarts (SRC-004 already lists
  tab persistence as a recommendation; history would ride the same
  future decision).

## Design tokens
No new colors, fonts, or radii — every value above is from the
existing canon palette (SRC-004 / navigation-model).

## Files
- `README.md` — this spec (the whole bundle; no prototype).
- See `design/document-tabs/` (strip anatomy, unchanged visuals) and
  `design/sidebar-navigation/` (sidebar and type panel, extended by
  the RECENT group).
