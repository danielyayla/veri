---
id: SRC-018
type: source
title: Design — Tab history and the visible working set
status: imported
created: 2026-08-18
updated: 2026-08-18
links:
  - id: REQ-016
    rel: designs
  - id: SRC-004
    rel: builds-on
  - id: SRC-014
    rel: builds-on
  - id: DEC-014
    rel: constrained-by
  - id: DEC-012
    rel: constrained-by
---

> **Approved by Daniel 2026-08-18.** Drafted 2026-08-18 by an agent
> session (Claude Code) for [[WO-039]], per the DEC-012 design gate.
> The handoff spec lives in `design/tab-history/` (written spec only,
> no prototype: the surface deltas are small and the substance is
> behavioral).

Gives every tab a back/forward history so following a trail
SRC → REQ → DEC → WO is reversible, and makes the working set visible:
the persisted recents render as a sidebar RECENT group and the type
crumb becomes live. Delivers [[REQ-016]]; implemented by [[WO-039]].

## The central decision

Per-tab history cannot be bolted onto [[SRC-004]]'s model, where a
tab's identity *is* its document and every link click spawns a new
pinned tab — a tab whose content never changes has no history. The
design moves link navigation to the Obsidian/browser model while
keeping the rest of the tabs canon intact:

- A tab becomes a **history surface**: a stable key plus an entry
  stack (`{target, scroll}`) and an index; the strip renders the
  current entry.
- **Plain click on a link** (body `[[id]]` chips, Connections cards,
  palette ↩) navigates the current tab **in place**, pushing an entry
  and truncating the forward stack browser-style. This supersedes
  SRC-004 rule 1; the keep-both-open workflow moves to ⌘-click, which
  still opens a background pinned tab.
- The same document may now show in two tabs (supersedes rule 2 for
  documents; view tabs stay singletons). Navigation never changes
  pinned-ness (supersedes rule 3's auto-pin clause); browsing surfaces
  still share the single preview tab, which accumulates history as it
  is reused.
- ⌘[ / ⌘] (Alt+←/→ off-mac) and two ‹ › buttons leftmost in the tab
  strip walk the active tab's history; scroll position is captured on
  leave and restored on return.
- History is session state, in memory only — never persisted, never
  in `veri/`; the [[DEC-014]] workspace file keeps exactly its
  current shape.

## The visible working set

- A sidebar **RECENT group** (between Graph and the flex filler):
  the DEC-014 persisted recents, newest-first, capped at 6, hidden
  when empty; click opens the preview tab, ⌘-click a background tab.
  This reverses [[SRC-014]]'s "RECENT section retired" clause on the
  evidence of [[SRC-016]], which scored context preservation 2/5.
- The **type crumb goes live**: clicking `Requirements` in
  `Requirements / REQ-008` opens the Requirements type panel (a
  browser, not a route — the active tab does not change).

## Everything unchanged

Strip anatomy and tab visuals, preview double-click-to-pin, ⌘-click
background opens, close/reorder/cycle, the empty state, the sidebar
and type panel layout, the recents data pipeline and the palette's
recency boost, pins. No new tokens. Editor buffers stay keyed by
document id; a dirty buffer is never silently dropped — closing the
last tab whose history references a dirty doc raises the existing
Save/Discard/Cancel prompt.
