---
id: SRC-022
type: source
title: Design — Full search results and the related filter
status: imported
created: 2026-08-18
updated: 2026-08-18
links:
  - id: REQ-004
    rel: designs
  - id: SRC-005
    rel: builds-on
  - id: SRC-016
    rel: derived-from
  - id: DEC-009
    rel: constrained-by
  - id: DEC-012
    rel: constrained-by
---

> Drafted 2026-08-18 by an agent session (Claude Code) for the search
> results work order, per the DEC-012 design gate, under Daniel's P1
> implementation directive of 2026-08-18. Pending Daniel's review.
> Written spec only.

[[SRC-016]]: "the palette caps at 8 rows with no 'all results' view",
and scale is a search problem. This gives the palette an overflow
surface and gives search the graph: a `related:` filter that turns
"what touches WO-028?" from a Connections-panel walk into a query.

## The `related:` filter

`related:WO-028` narrows any query to the 1-hop neighborhood of the
named id: documents it links to, documents that link to it (frontmatter
links and inline `[[refs]]`, both directions — the same edge set the
Connections panel derives), plus the id itself. Composable with
everything existing: `related:WO-028 is:active`, `related:REQ-004
gate`. An unknown id yields zero hits and the palette's existing empty
state — never an error.

It lives in the shared search library (`parseQuery` / `rankDocs`,
[[DEC-009]]) so the palette, the search view, and MCP `search` gain it
in the same commit — one concept, one implementation (manifesto 7).
The MCP tool description names the filter so agents discover it.

## The search results view

A **Search view** — a singleton view tab like Board or Graph, holding
one query.

- **Entry**: when hits exceed the palette's 8 rows, the palette's last
  row becomes `See all N results ↵` (selectable like any row); Enter
  on it — or ⌘Enter anywhere in the palette — opens the Search view
  seeded with the current query. The palette stays the fast path; the
  view is the thorough one.
- **Anatomy**: a query field at top (same filter syntax, editable,
  focused on open), result count, then one row per hit: id in type
  color, title, status chip, and the matched-line snippet with the
  match bolded — the palette row, given room to breathe. Click opens
  the doc (preview tab), ⌘-click background — [[SRC-018]] semantics
  exactly.
- **Ranking**: the shared library's scores, unsliced. No new ranking.
- **Scale** (manifesto 10): results render the top 200 with a
  final line `N more — refine the query`. Nothing lists everything.
## Everything unchanged

The palette's 8-row cap, ranking, recency boost, `type:`/`is:`
shorthands, and view/command rows ([[SRC-005]] layer 2); the sidebar;
the topbar search button (already a ⌘K affordance, untouched);
the Connections panel (the browsing surface for one document's
neighborhood — the search view is for queries, not a replacement).
No new tokens.
