---
id: SRC-029
type: source
title: Design — Find in document
status: imported
created: 2026-08-19
updated: 2026-08-19
links:
  - id: REQ-009
    rel: designs
  - id: SRC-008
    rel: builds-on
  - id: SRC-016
    rel: derived-from
  - id: DEC-012
    rel: constrained-by
  - id: REQ-020
    rel: constrained-by
---

> Drafted 2026-08-19 by an agent session (Claude Code) for the
> find-in-document work order, per the DEC-012 design gate, under
> Daniel's P2 implementation directive. Pending Daniel's review.
> Written spec only.

[[SRC-016]]: "no find-in-document." Project-wide search exists twice
(palette, Search view); the open document — the surface the user is
actually reading — has nothing. ⌘F should do in Veri what it does in
every editor since forever.

## One bar, two backends

**⌘F** opens a find bar at the top right of the content area (below
the tab strip, floating over the reader/editor, the `.pv-pop` shadow
register): a labeled input, a match count (`3/17`), ‹ › previous/next
buttons, and Escape/× to close. Enter advances, Shift+Enter goes
back, wrapping at the ends. Case-insensitive substring match — no
regex, no options; the palette's plainness applies (add options only
on evidence). The count is announced via `aria-live` and every
control is a real labeled button ([[REQ-020]]).

The bar is one component; the match/highlight engine differs by mode
because the surfaces differ:

- **Edit mode (CM6)**: back the bar with `@codemirror/search`'s
  programmatic API — `SearchQuery`, `setSearchQuery`, `findNext`/
  `findPrevious` — added as the one new dependency, with CM6's own
  panel UI disabled; the app's bar is the only chrome. Match
  highlight styling maps the search-match classes onto existing
  selection/flash tokens.
- **Read mode**: matches are found by walking the rendered text and
  highlighted via the CSS Custom Highlights API
  (`CSS.highlights` — supported by the app's Chromium), which
  paints ranges without mutating the rendered DOM: chips, previews,
  and every listener stay untouched. Current match gets a stronger
  highlight; navigation scrolls it into view.

The bar binds to the active tab's mode and follows mode toggles
(⌘E re-runs the query against the other backend). It closes on
navigation and tab switch; `inTextTarget` gains the bar's input so
⌘[/⌘] keep working while it is focused. The query is transient —
never persisted.

## Everything unchanged

Project-wide search (palette, Search view, shared library — this is
a different concept: position in a buffer, not rank over a corpus),
the editor's extensions and guards, rendered-markdown output, tokens
(highlight colors derive from the existing accent/flash palette).
