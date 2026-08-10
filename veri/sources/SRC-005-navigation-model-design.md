---
id: SRC-005
type: source
title: Design — Navigation model for the desktop UI at scale
status: imported
created: 2026-08-10
updated: 2026-08-10
links:
  - id: REQ-004
    rel: designs
  - id: SRC-004
    rel: builds-on
  - id: DEC-002
    rel: constrained-by
  - id: DEC-009
    rel: constrained-by
---

> **Approved by Daniel 2026-08-10.** Produced from the 2026-08-10
> navigation architecture review; the high-fidelity handoff bundle
> (README + interactive prototype) lives in `design/navigation-model/`.
> Implementation proceeds as the three work orders proposed below.

How the desktop UI navigates a project as it grows from dozens of
documents to hundreds. This design extends [[REQ-004]]'s five screens; it
does not replace them. Tabs ([[SRC-004]], shipped by [[WO-012]]) are the
first layer of this model and are treated as given.

## Principles

1. **The filesystem is the knowledge; the UI is the lens.** Users create
   and edit files with any tool and Veri renders them ([[DEC-002]]).
   Navigation state (pins, recents, open tabs) is workspace state, not
   knowledge — it lives in Electron userData per project, following the
   [[DEC-010]] precedent, never in `veri/`.
2. **The agent does not browse.** Agents reach documents through MCP
   `search` and `get_context`. Every surface in this design is optimized
   for human comprehension only; nothing needs to serve both audiences.
3. **Lifecycle is the scale lever.** Veri documents die on a schedule:
   work orders go `done`, decisions get `superseded`, requirements get
   `retired`. A mature project is mostly dead documents. Navigation
   defaults to the living ones and makes the dead ones one click away —
   this, not a heavier hierarchy, is what keeps the sidebar small.
4. **Tabs and search are the spine.** The sidebar is a launcher and a
   working set, not an inventory. Deep traversal happens through
   `[[ID]]` links, the Connections panel, tabs, and the palette.

## Layer 1 — Tabs (shipped)

Per [[SRC-004]] / [[WO-012]]. No changes. Later layers reuse its
pinned-vs-preview semantics exactly: browsing surfaces open the shared
preview tab; deliberate opens create pinned tabs.

## Layer 2 — Command palette (⌘K)

One input that reaches any document or view. Reuses the search built for
the MCP server through the shared library ([[DEC-009]]); no second index.

- **Matching**, ranked: exact id (`REQ-014`, case-insensitive, with or
  without zero-padding — `req14` resolves) → title fuzzy match →
  full-text body match. Recently opened documents get a rank boost.
- **Filters** as typed prefixes: `req:` `dec:` `wo:` `src:` narrow by
  type; `is:done`, `is:active`, `is:backlog` narrow by status. Prefixes
  compose (`wo: is:backlog auth`).
- **Views** are rows too: typing `board`, `graph`, `decisions`, `home`,
  or `agent` surfaces the matching view tab.
- **Open semantics** mirror [[WO-012]]: Enter opens in the shared
  preview tab; ⌘Enter opens a pinned tab in the background; Esc closes
  the palette and returns focus to the active tab.
- **Row anatomy**: type-colored id chip (same chip as the tab strip),
  title, status badge, dimmed match-context snippet for body matches.
- ⌘K opens it; it floats over the workspace and never becomes a tab.

## Layer 3 — Sidebar: working set + live tree

The sidebar remains one pane with fixed sections, top to bottom. No
modes — the distinct needs (hot documents, live documents, everything)
are sections and filters of a single tree, not alternate sidebars.

**Pinned** — documents the user starred (pin action in tab context menu
and document header). Ordered manually by drag. Hidden when empty.

**Recent** — last 8 opened documents, most recent first, excluding ones
already pinned. Not configurable.

**Documents** — the tree, grouped by type exactly as today, with two
changes:

1. *Live-by-default filtering.* Each type section shows only living
   documents: requirements `draft`/`accepted`; decisions `active`; work
   orders `backlog`/`in-progress`. Each section footer shows the
   remainder as a dimmed expander — "12 done", "3 superseded",
   "2 retired" — which expands that section in place to show all.
   Sources have no lifecycle; the Sources section shows all but is
   collapsed by default.
2. *Subfolders render, and mean nothing.* If the user organizes
   `veri/requirements/auth/…`, the tree mirrors the folders. Nothing
   else in Veri reads them: not `veri check`, not context assembly, not
   search ranking. Moving a file between folders changes no semantics.
   This is a hard rule, recorded here so it rides in context packages:
   **folder position is presentation-only**.

Section headers show live counts ("Work orders · 4"). All sidebar
clicks keep [[WO-012]] preview semantics.

## Layer 4 — Home view

The default tab on project open and the answer to "what needs
attention". Replaces scrolling the sidebar as the way to grok a project.
This is largely assembly of things [[REQ-004]] already requires, not new
machinery:

- **Health** — `veri check` output grouped by issue kind, each row
  opening the affected document. The topbar chip deep-links here.
- **In flight** — work orders in `backlog`/`in-progress` as a compact
  list (id, title, status, linked-REQ count, agent marker), mirroring
  the Board's live columns.
- **Agent activity** — the [[REQ-004]] write-back feed (context pulls,
  filed decisions, receipts), newest first, project-wide.
- **Recently changed** — documents by `updated` date, so external and
  agent edits surface without hunting.

Home is a view tab like Board or Graph: reachable from the sidebar rail
and the palette, closeable, one instance.

## Explicitly deferred

Not designed here; each waits for a real project that outgrows layers
1–4, and gets its own design doc when it does:

- **Per-type list views** (sortable/filterable tables). When built, they
  are saved palette searches rendered as tables — the same index and
  filter grammar, not a parallel subsystem.
- **Area/epic metadata field** for cross-cutting grouping.
- **Timeline view**, **tab persistence across restarts** (already noted
  as follow-up in [[WO-012]]).
- **Graph view ambitions** — Graph stays a navigation aid per
  [[REQ-004]]; the Connections panel remains the primary relationship
  surface.

## Rejected directions

- **Sidebar modes (Files / Browse / Working set)** — three renderings of
  the same four directories; modes are hidden state and triple every
  future sidebar feature. Sections and filters of one tree cover the
  same needs.
- **Activity-based top nav (Home / Work / Inbox / Assigned)** — imports
  multi-user tracker entities (assignees, inboxes) that Veri v1 does not
  have. Revisit only if Veri ever gains collaboration semantics.
- **Semantic folders** — letting directory position carry meaning (area,
  status, priority) creates a second source of truth beside frontmatter
  and breaks portability of the `veri/` directory.
- **Exhaustive sidebar tree** (status quo at scale) — an inventory, not
  navigation; unusable past ~50 documents without lifecycle filtering.

## Proposed work order split

Three work orders, independently shippable, in value order — filed
separately on approval:

1. **Command palette** (layer 2) — highest navigation value per line of
   code; depends only on the shared search library.
2. **Sidebar working set + live filtering** (layer 3) — includes the
   userData persistence for pins/recents (likely a small DEC at
   implementation time).
3. **Home view** (layer 4) — depends on nothing above but benefits from
   the palette for its row-open interactions.
