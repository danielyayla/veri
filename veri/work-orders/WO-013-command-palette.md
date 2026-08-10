---
id: WO-013
type: work-order
title: Command palette (⌘K) — one input to any document or view
status: in-progress
created: 2026-08-10
updated: 2026-08-10
links:
  - id: REQ-004
    rel: extends
  - id: SRC-005
    rel: designed-by
  - id: DEC-008
    rel: constrained-by
  - id: DEC-009
    rel: constrained-by
  - id: DEC-012
    rel: constrained-by
  - id: WO-012
    rel: depends-on
---

## Summary

Layer 2 of the [[SRC-005]] navigation model: a ⌘K command palette that
reaches any document or view from one input. It replaces the topbar
search popover. Matching is ranked (exact id with optional zero-padding
→ id prefix → title starts-with → title contains → full-text body match
with a snippet), recently opened documents get a rank boost, and typed
prefixes compose as filters (`req:` `dec:` `wo:` `src:`, `is:done`
`is:active` `is:backlog` — `is:active` means living). Views (Board,
Graph, Decisions, Agent connection) are rows too, suppressed while a
type/status filter is active. Open semantics mirror [[WO-012]]: Enter or
click opens the shared preview tab and closes the palette; ⌘Enter or
⌘click opens a pinned tab in the background and keeps the palette open;
Esc closes; ⌘K toggles. The palette floats over the workspace and never
becomes a tab. Visuals are pixel-specified in
`design/navigation-model/README.md`.

Per [[DEC-009]] the palette reuses the search corpus of the MCP server
through `@veri/mcp`'s library exports — no second index. The ranked
matcher extends the shared search module and is exported alongside
`searchDocs`; the MCP `search` tool's behavior is unchanged.

## In scope

- `packages/mcp/src/search.ts`: exported palette query parser (filter
  prefixes) and ranked matcher over loaded documents, with colocated
  `node --test` coverage. The MCP server's `search` tool keeps calling
  `searchDocs` exactly as today.
- IPC plumbing (`main.ts`, `preload.mts`, `renderer/api.ts`): the
  renderer's search call becomes the ranked palette search,
  parameterized by the renderer's recently-opened doc ids.
- Renderer: palette overlay (scrim, 580px panel, input row, results
  list capped at 8, footer with the filter-grammar reminder, empty
  state) per the README's pixel values; view rows via the existing
  `VIEW_META`; keyboard handling (⌘K toggle, ↑↓ selection, Enter,
  ⌘Enter, Esc) and mouse hover selection; the topbar "Search docs… ⌘K"
  field opens it. Old search popover state and styles removed.
- Pure row-merge logic (doc hits + view rows → top 8) colocated and
  unit-tested.

## Out of scope

- Sidebar changes, pins/recents persistence, icon rail (WO-014) and the
  Home view (WO-015). The palette's view rows cover only views that
  exist today; Home joins via `VIEW_META` when WO-015 lands.
- Any change to the MCP server surface (`server.ts`), `packages/core`,
  or `packages/cli`.
- Everything `design/navigation-model/README.md` defers: per-type list
  views, area/epic metadata, timeline view, tab persistence across
  restarts, graph-view expansion.

## Acceptance tests

- [ ] `req14` and `REQ-014`-style queries rank the exact-id doc first;
      id prefix beats title starts-with beats title contains beats body
      match; body matches render a one-line dimmed snippet.
- [ ] `wo: is:backlog auth` composes: only backlog work orders matching
      "auth" (prefixes stripped from the free-text query); `is:active`
      matches living statuses (draft, accepted, active, backlog,
      in-progress).
- [ ] Typing `board` (or `graph`, `decisions`, `agent`) surfaces the
      view row; view rows disappear while a type/status filter is
      active; view rows open the view as a preview tab.
- [ ] Enter/click opens the selected doc in the shared preview tab and
      closes the palette; ⌘Enter/⌘click opens a pinned background tab
      and leaves the palette open; Esc closes it; ⌘K toggles it; the
      topbar search field opens it.
- [ ] Recently opened docs rank above equal-score matches.
- [ ] Unit tests for the parser, ranking, and row merge pass; `npm test`
      green across the workspace.
- [ ] `veri check` reports zero issues.

## Receipts
