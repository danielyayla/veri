# Design addendum — An accessibility floor across the renderer

Handoff spec for [[WO-043]] / [[REQ-020]], drafted 2026-08-18 by an
agent session (Claude Code) per the DEC-012 design gate. Written spec
only, no prototype: this bundle changes semantics, focus behavior, and
assistive-tech surface — the visual design is explicitly unchanged.

This is a **cross-cutting addendum**, not a new surface. It generalizes
the accessibility section of `design/markdown-editor/` (SRC-008) — the
only bundle that has one — into rules every existing and future surface
must meet. Where a per-bundle spec already says something stricter,
that spec wins.

## Baseline being fixed

Audited 2026-08-18 at WO-039's head: ~101 `onClick` sites across the
renderer, 9 of them real `<button>`s; zero `aria-*`, `role`, or
`tabindex` attributes anywhere; `:focus` styles only on four text
inputs; Escape handled ad hoc per layer with no stacking rule; focus is
destroyed on every state change because `render()` rebuilds the tree
with `replaceChildren`.

## Tokens

One new token, generalized from SRC-008's editor ring; no new colors,
fonts, or radii.

- **Focus ring** — `outline: 2px solid rgba(232,112,58,0.4);
  outline-offset: 1px;` applied via `:focus-visible` on every focusable
  element (`*:focus-visible` plus the explicit-role selectors). Mouse
  clicks never paint the ring; keyboard focus always does. Inputs that
  already have a `:focus` border keep it and gain the ring only under
  `:focus-visible`.

## Rule 1 — Real controls

Every element with a click handler becomes a native control, or carries
an explicit role with keyboard activation. The mechanism:

- A shared `btn-reset` CSS class zeroes native button chrome
  (`background:none; border:none; padding:0; margin:0; font:inherit;
  color:inherit; text-align:inherit; cursor:pointer;`) so converting
  `<div onClick>` → `<button class="btn-reset …">` is visually inert.
  Block-level controls (sidebar rows, cards, palette rows) add
  `display:block/flex; width:100%` as their existing class already
  dictates.
- Anything that navigates or acts becomes a `<button>`: sidebar view
  and collection rows, RECENT rows, tab strip chevrons (already
  buttons), type-panel rows and expander, palette rows, Connections
  cards, board cards, graph popover open row, decision ids and
  supersede pointers, home rows, review link rows, approve / return /
  cancel controls, MCP buttons, welcome cards, project-switcher rows,
  pin chip, mode-toggle segments, status-control segments, agent-picker
  chips, inline `[[id]]` chips (`idChip` in widgets.ts — a `<button>`
  styled as the chip; broken chips stay inert `<span>`s).
- Non-interactive colored chips (`chip-status`, `typeChip`) stay
  `<span>`s — no role, no tab stop.
- Every icon-only control gets an `aria-label` naming object and
  action: `Close WO-039`, `Back`, `Forward`, `Close panel`,
  `Settings`, `Pin REQ-008`.
- Drag reorder and middle-click close on tabs remain pointer-only
  affordances; their keyboard equivalents already exist (⌘⇧[/] cycle;
  close via the tab's × button or ⌘W).

## Rule 2 — Focus survives the rebuild

`render()` replaces the whole tree on every update, so focus must be
captured and restored exactly like scroll already is:

- Every focusable element gets a stable `data-fkey` derived from what
  it is, not where it sits: `tab:t3`, `tab-close:t3`, `side:board`,
  `side:collection:decision`, `recent:REQ-016`, `chip:DEC-014:2` (nth
  occurrence in the body), `pal-row:4`, `status:in-progress`, etc. The
  `h()` helper accepts it as a plain attribute.
- Before `replaceChildren`, capture `document.activeElement`'s fkey;
  after, re-focus the element with the same fkey if it still exists
  (`preventScroll: true` — scroll restoration owns the viewport). If
  it's gone (closed tab, filtered-out row), focus falls to the nearest
  surviving sibling by DOM order within the same container, else to
  the container itself, never silently to `<body>`.
- CodeMirror islands keep their own focus lifecycle (`editorFocused`
  already tracks it); the fkey pass skips them.

## Rule 3 — The layer stack

All transient layers share one model: a stack, `Escape` closes the
topmost, focus is trapped while open and restored to the invoker on
close. The invoker is recorded by fkey (rule 2), so restoration
survives rebuilds.

| Layer | Role | Trap | Initial focus |
| --- | --- | --- | --- |
| ⌘K palette (`pal-panel`) | `role=dialog` + input `role=combobox` over `role=listbox` rows (`aria-activedescendant`, `aria-expanded`) | yes | the input |
| New-project sheet (`np-sheet`) | `role=dialog` `aria-modal=true` | yes | name input |
| New-doc popover (`nd-pop`) | `role=dialog` `aria-modal=true` | yes | title input |
| Dirty-close prompt (`cc-pop`) | `role=alertdialog` `aria-modal=true` | yes | Cancel button |
| Approve popover (`rv-pop`) | `role=dialog` `aria-modal=true` | yes | Cancel button |
| Template reset confirm | `role=alertdialog` | yes | "no" button |
| Settings popover (`settings-pop`) | `role=menu`, rows `role=menuitem`, ↑↓ move | yes | first item |
| Project switcher (`proj-pop`) | `role=menu`, rows `role=menuitem` | yes | current project row |
| Agent picker (`ap-pop`) | `role=menu` | yes | first chip |
| Graph node popover (`gr-pop`) | `role=dialog` (non-modal) | no | open button |
| Type panel | none — it is a sibling pane, not a layer | no | filter input (existing autofocus) |
| Toast | see Rule 4 | — | — |

The palette's listbox keeps its existing ↑↓/↩ behavior — the roles
formalize it. The type panel joins the Escape stack (already closes on
Escape when the filter is empty; unchanged), but never traps focus.

## Rule 4 — Live announcements

One permanently mounted polite live region in the app shell
(`<div class="sr-live" aria-live="polite">`, visually hidden), written
through a single `announce(text)` helper. Announced, per the canon that
already requires them:

- Editor guard rejections — the status-row notice text verbatim
  (SRC-008: "id: is generated — edit rejected", etc.).
- Copy confirmations — "Copied kickoff prompt", "Copied context
  package", "Copied command" (MCP view), matching the visible ✓ label.
- The existing toast messages (project errors, watcher notices) — the
  toast element itself additionally becomes `role=status`.

Nothing else announces; this is a floor, not a narration layer.

## Rule 5 — No color-only state

The advisory-surfacing rule (issues are amber and *filled*, advisories
grey and *hollow*) generalized: every state a colored dot or chip
encodes must also read through text, glyph, or shape. Inventory:

Already compliant (shape/text channel exists): status + type chips
(text), hollow-vs-filled health dots (shape), activity agent dot
(paired "agent" text), board agent marker ("⌁ agent"), kickoff copied
("✓ Copied"), checkboxes (✓ glyph), preview-tab italics (shape), pin
(★/☆ glyph), guarded ghost text (paired notice, SRC-008).

To fix:

- **Tab dirty dot** — presence is the channel for sighted users
  (kept); the tab's accessible name appends "— unsaved changes" and
  the close button's label already says it. No visual change.
- **Broken link chip** (`chip-broken`) — gains a leading `⚠` glyph;
  the title moves into an always-available `aria-label`.
- **Board / sidebar health dots** — keep their hover titles and gain
  matching `aria-label`s; the filled/hollow shape rule is the sighted
  channel.
- **Colored id text** (tabs, crumbs, decision log) — the id prefix
  (REQ/DEC/WO/SRC/WF) is itself the text channel; nothing to add.
- **Active states** (tab, mode segment, status segment, sidebar row) —
  carried by `aria-selected` / `aria-pressed` / `aria-checked`, with
  the existing background/underline treatment unchanged.

## Composite widget semantics

- **Tab strip** — container `role=tablist` (`aria-label="Open tabs"`);
  each tab `role=tab`, `aria-selected`, roving tabindex (←/→ move
  focus, ↩/Space activate); the close × stays a real `<button>` inside
  the tab element (pragmatic VS Code-style compromise, noted
  deviation from the pure tab pattern). Chevrons stay plain buttons
  outside the tablist.
- **Mode toggle** — group `role=group` `aria-label="View mode"`, two
  buttons with `aria-pressed`.
- **Work-order status control** — `role=radiogroup`
  `aria-label="Status"`; segments `role=radio` `aria-checked`, roving
  tabindex, ←/→ move, ↩/Space apply.
- **Sidebar** — `<nav aria-label="Project">`; plain buttons in DOM
  order (no roving) so Tab walks visual order: views → collections →
  graph → recents → settings.
- **Reader body** — `[[id]]` chip buttons participate in normal tab
  order; Connections cards are single buttons whose accessible name is
  "REQ-008 — <title>".

## Keyboard flows (acceptance walkthroughs)

1. **Approve**: Tab to sidebar → NEEDS REVIEW row (Home) or pending
   doc → review banner "Approve…" button → popover opens, focus on
   Cancel → Tab to Approve → ↩ → popover closes, focus returns to the
   banner, `announce` not required (visible state change is the
   record).
2. **Status change**: Tab to the status radiogroup → ←/→ to
   "in progress" → ↩ → status writes, focus stays on the segment.
3. **Tabs**: Tab into the tablist → ←/→ between tabs → ↩ activates →
   Tab reaches the × → ↩ closes (dirty prompt traps if needed) →
   focus lands on the neighbor tab per the existing close rule.
4. **Links**: Tab through reader chips → ↩ navigates in place
   (SRC-018) → ⌘[ returns — focus restored to the chip by fkey.

## State management

No new persistent state; no change to `veri/` or the DEC-014 workspace
file. New renderer-internal pieces: the layer stack (derivable from
existing state flags — formalized as an ordered list so Escape and
trapping are computed, not hand-ordered), the fkey capture/restore pass
in `render()`, and the `announce` helper. Focus-order, trap-cycling,
fkey-resolution, and announcement-formatting logic land as pure
functions (`a11y.ts`) under node:test; end-to-end keyboard flows are
verified in the headless Electron harness via dispatched `KeyboardEvent`s
(no simulated typing — navigation keys only).

## Explicitly deferred

- Full screen-reader/AT audit beyond roles, labels, and live regions.
- CodeMirror's internal keymap (SRC-008 owns the editor island).
- Skip links, landmarks beyond the sidebar `<nav>`, `prefers-reduced-
  motion`, and high-contrast theming — later polish, not the floor.
