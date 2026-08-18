---
id: WO-048
type: work-order
title: "Full search results and the related filter"
status: in-progress
created: 2026-08-18
updated: 2026-08-18
links:
  - id: REQ-004
    rel: implements
  - id: SRC-022
    rel: designed-by
  - id: SRC-016
    rel: derived-from
  - id: DEC-009
    rel: constrained-by
---

## Summary

The palette caps at 8 rows with no all-results view, and asking "what touches WO-028?" requires walking the Connections panel ([[SRC-016]]). Per [[SRC-022]]: add a related:ID filter to the shared search library ([[DEC-009]]) narrowing any query to the 1-hop link neighborhood (both directions, frontmatter and inline refs), and a singleton Search view tab entered from the palette's "See all N results" overflow row or ⌘Enter, showing every hit with snippet at the shared library's ranking, capped at 200 rendered rows.

## In scope

- related:ID token in parseQuery/rankDocs in the shared search library: 1-hop neighborhood (outbound + inbound, frontmatter links + inline refs) plus the id itself; composable with text, type:, is:; unknown id yields zero hits, never an error
- MCP search tool description names the new filter
- A Search view: singleton view tab with editable query field (same syntax, focused on open), result count, one row per hit (id in type color, title, status chip, matched-line snippet with match bolded)
- Palette entry: last row becomes "See all N results ↵" when hits exceed 8; ⌘Enter opens the Search view from any palette state
- Row clicks follow SRC-018 semantics (preview tab; ⌘-click background)
- Render cap at 200 with a "N more — refine the query" final line
- Colocated tests: related: parsing and neighborhood edges, overflow row, view row assembly

## Out of scope

- Changes to palette ranking, recency boost, 8-row cap, or view/command rows
- Multi-hop or weighted graph queries
- Replacing or changing the Connections panel
- Topbar changes (the search button already opens the palette)
- New colors or tokens

## Requirements

- [[REQ-004]] — implements
- [[SRC-022]] — designed-by
- [[SRC-016]] — derived-from
- [[DEC-009]] — constrained-by

## Acceptance tests

- [x] related:WO-028 lists exactly WO-028's 1-hop neighborhood plus itself; related:WO-028 is:active composes; an unknown id shows the palette's empty state
- [x] The same related: query returns the same hits via the MCP search tool and its description names the filter
- [x] A query with more than 8 hits shows "See all N results ↵" as the palette's last row; Enter on it opens the Search view seeded with the query
- [x] ⌘Enter in the palette opens the Search view with the current query
- [x] Search view rows show snippet with the match bolded and open docs with SRC-018 semantics
- [x] More than 200 hits renders 200 rows plus the refine line
- [x] npm test passes; veri check reports zero issues

## Receipts

(none yet)
