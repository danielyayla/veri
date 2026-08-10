# Handoff: Approval Gate UI (proposed SRC-006)

## Overview
UI for the document approval workflow (proposed REQ-008): agent-filed
decisions arrive as `proposed` and requirements as `draft`; nothing becomes
binding until Daniel approves it in the app. This handoff covers the review
queue on Home, the review banner + approve flow in the document view,
pending markers in the sidebar/palette, and gated-work-order indicators.
The core mechanics (schema `proposed` status, `approved:` stamp, `veri
check` gating, proposal-only MCP writeback) are a separate non-UI work
order — this design assumes they exist and only puts a face on them.

## About the Design Files
The files in this bundle are design references created in HTML (a
self-running prototype), not production code. Recreate in `packages/ui`'s
existing vanilla-TypeScript renderer patterns (DEC-008). Do not ship the
HTML directly.

## Fidelity
High-fidelity. Colors, typography, spacing, and copy are final; reuse the
tokens and component idioms from the navigation-model handoff
(`design/navigation-model/README.md`) — this design adds no new tokens,
only new uses of existing ones.

## Non-negotiable principles
- **Files are the source of truth (DEC-002).** Approving is a frontmatter
  edit (`status` flip + `approved:` date stamp) written to the markdown
  file — no app-side approval registry, ever. The UI must show the exact
  edit it is about to make before making it.
- **The UI is a convenience, not the lock.** Approval can equally happen
  by editing the file by hand; the app re-reads state from disk and must
  render correctly whichever way a document was promoted.
- **Pending documents are visible, never hidden.** A proposal you can't
  see is a proposal you'll re-derive and contradict. Pending docs appear
  everywhere their type appears, marked, not filtered out.
- **Approve is deliberate, not one-click.** Exactly one confirm step
  (popover), which states the consequence. No bulk approve.

## Surfaces

### 1. Home — NEEDS REVIEW card
A full-width card spanning the grid, placed **above** the existing 2×2
grid (HEALTH / IN FLIGHT / AGENT ACTIVITY / RECENTLY CHANGED). Hidden
entirely when the queue is empty — Home looks exactly as it does today.

- Card chrome identical to the other Home cards (1px `#1E1E24`, radius
  10px, background `#131316`). Header: mono 10px letter-spaced label
  `NEEDS REVIEW` in warn `#D9A03F` + right-aligned meta count
  (`2 pending`).
- Row anatomy (matches other Home cards; hover `#17171B`; click opens the
  doc as a preview tab): id chip (type color, 52px col) · title
  (`#C9C6CF`) · pending chip (mono 9.5px `#D9A03F` on `rgba(217,160,63,
  0.08)`, 1px `#3A3020`, radius 4px — text `proposed` or `draft`) ·
  relative filed time, right-aligned (`#6E6B76`).
- Sort: oldest first (the longest-waiting proposal is the most urgent —
  it may be gating work).

### 2. Sidebar + command palette — pending markers
- Sidebar rows for pending docs get a **6px amber dot** (`#D9A03F`)
  immediately left of the id, same geometry as the health-dot convention
  from the document-tabs handoff. Tooltip (custom, instant, rail-tooltip
  styling): "Awaiting review".
- Live-by-default already includes `draft` REQs and now `proposed` DECs
  (they are living). No sidebar structure changes.
- Palette: new composable filter `is:proposed` (matches `proposed`
  decisions and `draft` requirements — one filter for "awaiting review",
  not two). Pending rows in palette results reuse the amber dot before
  the id chip.

### 3. Document view — review banner
For any `proposed` decision or `draft` requirement, a banner sits between
the document header and the body. Background `rgba(217,160,63,0.06)`,
1px `#3A3020` border, radius 8px, padding 12px 14px.

- Line 1: `◌ Awaiting your review` — Source Sans 3 13px semibold
  `#D9A03F` (the `◌` is the pending glyph, unicode, no asset).
- Line 2 (11.5px `#A09DA6`): provenance + consequence, exact copy:
  - decision: `Filed as a proposal by an agent session on {date}. It is
    not yet binding — context packages label it "pending" and work
    orders that depend on it stay gated until you approve.`
  - requirement: same with "requirement" phrasing: `Drafted by an agent
    session on {date}. Work orders can cite it but cannot start until
    you accept it.`
- Line 3, **What approving means** (collapsed disclosure row, 11.5px,
  chevron ▸/▾): expands to a two-column mini-list assembled from real
  graph data, not agent prose: left column "Becomes binding for" — the
  linked/inbound docs (each row an id chip + title, clickable); right
  column "Alternatives rejected" — anchor-link into the document's own
  `## Alternatives` section when present, else the row is omitted. No
  generated summaries: the review material is the document itself.
- Action row, right-aligned: `Request changes` (secondary: 1px `#26262C`
  border, `#C9C6CF` text, radius 7px, 28px height) · `Approve…`
  (primary: background `#7FAF8A`, text `#0F0F11`, semibold, radius 7px,
  28px height). Approve is green — it is the positive, constructive act;
  accent orange stays reserved for WO/brand.
- If `veri check` reports issues **on this document**, `Approve…` is
  disabled (40% opacity) with instant tooltip: `Fix check issues first —
  {n} on this document`.

### 4. Approve flow — confirm popover
Clicking `Approve…` opens a popover anchored below the button (popover
chrome: `#1F1F25`, 1px `#2B2B32`, radius 8px, shadow `0 6px 18px
rgba(0,0,0,.4)`, width 320px).

- Title (13px semibold `#E7E4DE`): `Approve DEC-015?`
- Body: the **exact frontmatter diff**, rendered as two mono 11px lines:
  - `status: proposed → active` (old value struck `#6E6B76`, new value
    `#7FAF8A`)
  - `approved: 2026-08-10` (added line, `#7FAF8A`)
- Caption (11px `#8B8893`): `Written to the markdown file. From the next
  context package on, agents treat this as binding.`
- Buttons: `Cancel` (ghost) · `Approve & stamp` (same green primary).
- On confirm: file written, banner disappears, toast (existing toast
  pattern) `DEC-015 approved`, Home queue count decrements. The document
  header's meta line gains `approved 2026-08-10` in mono 10px `#55525E`.

### 5. Request changes flow
Clicking `Request changes` swaps the banner's action row for an inline
note composer: single-line auto-growing textarea (background `#101013`,
1px `#26262C`, radius 6px, 12.5px text), placeholder `What should change
before you'd approve this?`, buttons `Cancel` · `Return with note`
(secondary styling).

- On submit, the app appends to the document under a `## Review notes`
  heading (creating it if absent):
  `- {date} (review): {note}`
  Status is untouched — the doc stays in the queue, and the note travels
  to any agent that pulls the doc in a context package. File-based, no
  side channel.
- **Rejection/deletion is deliberately out of scope**: discarding a
  proposal is a git act (delete the file), not a button. A proposal you
  never approve simply never gains authority.

### 6. Gated work orders
- A WO is *gated* when it links (frontmatter links, direct only) to any
  `proposed`/`draft` doc. Gated backlog WOs are legal (planning);
  gated in-progress/done WOs are `veri check` issues (surfaced by the
  existing HEALTH card — no new UI).
- WO document header: chip after the status chip — `gated · REQ-008`
  (mono 9.5px, `#D9A03F` on `rgba(217,160,63,0.08)`, 1px `#3A3020`,
  radius 4px; id clickable). Multiple gates: one chip per gating doc.
- Home IN FLIGHT rows: the same gate chip, compact (`gated`), between
  title and status.
- The agent-handoff kickoff actions (SRC-003 button row) are **disabled**
  on a gated WO, instant tooltip: `Gated — approve REQ-008 first`.

## State Management
- No new persistent state. Pending-ness, gates, and approval stamps are
  all derived from frontmatter on load, same pipeline as every status.
- `reviewComposer: { docId, text } | null` — session-only, which banner
  has its note composer open.
- Approve/return-with-note write through the same file-write path the
  MCP writeback uses (shared library, DEC-009/DEC-011 spirit): read,
  edit frontmatter/append section, write, re-parse.

## Copy summary (exact strings)
- Banner title: `Awaiting your review`
- Approve button: `Approve…` / popover confirm: `Approve & stamp`
- Popover caption: `Written to the markdown file. From the next context
  package on, agents treat this as binding.`
- Request changes: `Request changes` / `Return with note` / placeholder
  `What should change before you'd approve this?`
- Disabled approve tooltip: `Fix check issues first — {n} on this
  document`
- Gated kickoff tooltip: `Gated — approve {ID} first`
- Home card label: `NEEDS REVIEW`

## Design Tokens
None new. Reuses the navigation-model palette. Notable assignments:
pending/warn = `#D9A03F` family (chip tint `rgba(217,160,63,0.08)`,
border `#3A3020`); approve action = ok green `#7FAF8A` with `#0F0F11`
text; pending glyph `◌` (unicode, like all app glyphs).

## Explicitly deferred (do not build)
- Comprehension quiz / "challenge me" mode — explicitly dropped by Daniel.
- Bulk approve — against the deliberate-approval principle.
- Git-hook enforcement of human-only promotion — separate, non-UI.
- Discard/reject button — see §5.
- In-app diff of what changed since a review note — future.

## Files
- `approval-gate.html` — self-running prototype, open in a browser.
  Scenario bar (top right) switches: `home` (queue card) · `review`
  (proposed DEC with banner; Approve popover and Request-changes
  composer are live) · `approved` (post-approval state) · `gated-wo`
  (gate chips + disabled kickoff).
- No `support.js` — the prototype is fully self-contained.

See also: `design/navigation-model/README.md` (tokens, Home card and row
anatomy, tooltip pattern), `design/document-tabs/` (tab semantics,
health dots), and the SRC-006 source document in `veri/` once filed.
