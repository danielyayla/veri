# Handoff: First-class Markdown Editor (edit mode for document tabs)

## Overview
Adds direct markdown editing to the Veri desktop app, per REQ-009: every
document tab gains an **Edit mode** alongside the existing rendered
**Read mode**. In edit mode the user sees and edits the raw file —
frontmatter included — as normal markdown text, Obsidian-style. Veri's
structure (schemas, links, approval gate) stays a layer on top: saving
writes the file verbatim, `veri check` findings surface as indicators,
and only the approval boundary is enforced at the editor level.

Also covers document **creation**: type + title in, scaffolded file out,
straight into edit mode. No forms.

## About the Design Files
This bundle is a written spec plus `editor-prototype.html`, a
**self-contained interactive prototype** (open in a browser) showing the
design's look and behavior on illustrative "skiff" fixture content. The
prototype is a design reference, not production code — its hand-rolled
contenteditable editor stands in for CodeMirror 6, which is the engine
for the real implementation per DEC-020 (decorations, transaction
filters). All tokens are taken from the design canon
(`design/README.md`) and the document-tabs spec
(`design/document-tabs/README.md`); where this spec names a color,
font, or size, it is final.

## Fidelity
**High-fidelity for tokens and interaction rules.** Layout and states
are specified exactly; micro-typography of CM6 internals (caret width,
selection rendering) follows CM6 defaults.

## Layout
Unchanged shell: 44px topbar, 250px sidebar, 37px tab strip, active view
below. Edit mode replaces the reader's rendered column **in the same
tab** — it is a mode of the document tab, not a separate tab.

- Editor column: same geometry as the reader — max-width 740px, centered,
  padding 30px 40px 60px. Background app base `#0F0F11`.
- The Connections right panel stays visible in edit mode (read-only,
  reflects last-saved state). The Context Package panel (WO tabs)
  likewise.
- Scroll position is per-mode, preserved across mode switches within a
  tab session.

## Mode toggle
- Control: two-segment mono toggle in the breadcrumb row, right-aligned:
  `read | edit` — 11px JetBrains Mono, segment padding 3px 10px, radius
  6px, border `#26262C`; active segment ember-tinted
  (`rgba(232,112,58,0.1)` bg, `#F0A87E` text), inactive `#8B8893`.
- Keyboard: **⌘E** toggles modes (both directions). Entering edit mode
  places the caret at the start of the body (after frontmatter); a
  previous caret position in this tab session is restored instead.
- Views (Board / Graph / Decisions / MCP) have no edit mode; the toggle
  renders only on document tabs.

## Editor surface (CodeMirror 6)
Raw markdown, source-mode presentation. No inline WYSIWYG in v1.

Typography and syntax palette:
- Body text: Source Sans 3, 14.5px / 1.65, color `#C9C6CF`.
- Markdown marks (`#`, `**`, `-`, `>`, `[[`/`]]`, backticks): faint
  `#55525E` — visible but receding.
- Heading lines: text `#E7E4DE`, weight 600; `#` marks stay faint. No
  font-size inflation in v1 (uniform line height keeps editing calm).
- Inline code / fenced code: JetBrains Mono 13px, text `#A09DA6`, fenced
  block background `#131316` full-width of the column.
- Frontmatter block (between the `---` fences): JetBrains Mono 12px /
  1.7; keys `#8B8893`, values `#C9C6CF`, fences `#55525E`. Block carries
  a subtle left border 2px `#1E1E24` to read as "machine zone" while
  remaining plain editable text.
- `[[ID]]` links: the ID text takes its type color (REQ `#7EA6C4`, DEC
  `#CFA83D`, WO `#E8703A`, SRC `#908BA8`, WF `#7FAF8A`); unresolved IDs
  amber `#D9A03F` with dashed underline. **⌘-click** a link opens that
  document (background tab per tab-spec rule 4); plain click just places
  the caret — editing must never be hijacked by navigation.
- Selection: `rgba(232,112,58,0.18)`; caret `#E8703A`; active line
  background `#131316` at 60% (subtle).
- Gutter: none. No line numbers — these are documents, not code.

## Guarded ranges (approval boundary, REQ-008)
The frontmatter lines for `id:` and `approved:`, and the `status:` value
when a change would promote past the approval gate, are protected:
- No lock glyph — guarded lines render their key in ghost `#6E6B76`
  instead of the usual `#8B8893`, signalling "not yours to edit"
  quietly. A tooltip on hover explains: `set via veri approve`.
- Attempted edits inside a guarded range are rejected at the transaction
  level (CM6 transaction filter): the line flashes amber
  (`rgba(217,160,63,0.15)` background, 300ms ease-out) and a one-line
  notice appears in the status row (see below): `id is immutable` /
  `approval is set via veri approve` / `promotion requires approval`.
- Everything else in frontmatter (title, links, dates, non-gating status
  moves like backlog → in-progress where allowed) is freely editable;
  `veri check` remains the arbiter after save.

## Status row
A 28px row pinned to the bottom of the editor column (not the window),
JetBrains Mono 10.5px `#6E6B76`, hairline top border `#1E1E24`:
- Left: `● unsaved changes` (ember dot) when dirty; `saved` (fades out
  after 1.5s) after a save; guard notices appear here for 3s.
- Right: `⌘S save · ⌘E read` hint chips (10px, `#55525E`).

## Dirty state and saving
- **Explicit save**: ⌘S writes the buffer verbatim to disk, bumping only
  the `updated:` frontmatter date (the one silent rewrite; it happens in
  the write path, not the buffer, and the buffer refreshes to match).
- Dirty indicators: tab title gains VS Code semantics — the tab's × is
  replaced by an 8px ember dot `#E8703A` when dirty (× returns on tab
  hover). Closing a dirty tab prompts: small popover on the tab —
  `Unsaved changes` + buttons **Save** (primary ember) / **Discard**
  (text, `#8B8893`) / **Cancel**.
- Switching read/edit with unsaved changes keeps the dirty buffer; read
  mode shows last-saved content plus an amber strip banner: `⚠ viewing
  saved version — unsaved edits in edit mode` (banner tokens: bg
  `rgba(217,160,63,0.08)`, border `#3A3020`, text `#D9A03F`, 12px).
- No autosave in v1 (guards and conflict handling stay simple); revisit
  as a settings flag later.

## External changes and conflicts
- Clean buffer + file changes on disk → buffer reloads silently; a
  status-row note `reloaded from disk` shows for 3s.
- Dirty buffer + file changes on disk → amber banner pinned above the
  editor (same warning tokens): `⚠ changed on disk while you were
  editing` with buttons **Reload** (discard my edits) and **Keep mine**
  (mark resolved; next ⌘S overwrites). Neither side is ever dropped
  silently. Banner persists until a choice is made; editing stays
  possible beneath it.

## `[[` autocomplete
Same popover as the reader's note input, embedded in the editor:
- Trigger: typing `[[` (or ⌘-space inside an existing `[[…`). Popover
  anchors below the caret: bg `#1A1A1F`, border `#26262C`, radius 8px,
  shadow `0 12px 32px rgba(0,0,0,.5)`, max 8 rows.
- Row: mono ID in type color + sans title 12.5px `#C9C6CF`, ellipsized;
  active row bg `#1B1B20`. Filter matches ID and title substrings.
- Enter/Tab/click inserts `ID]] ` completing the link; Esc dismisses.
  Popover updates per keystroke; zero matches → popover hides (no empty
  state — the user may be typing a future ID on purpose, which is valid).

## Creating documents
- Entry points: a `+` affordance (14px, `#55525E`, hover `#E7E4DE`) on
  each sidebar type-group header, and **⌘N** anywhere.
- Popover (anchored to the `+`, or centered 320px for ⌘N): four-segment
  type control (mono 11px — REQ / DEC / WO / SRC, segments tinted in
  their type colors when active; ⌘N preselects the group whose `+` was
  hovered last, else requirement) + title input (sans 13px, 34px tall,
  focus border `#8A4A2C`) + **Create** button (primary ember). Enter
  creates.
- Creation scaffolds the file with the next free ID, today's dates, the
  type's initial status (draft / proposed / backlog / imported), an empty
  links list, and kebab-case filename per house convention; the doc
  opens as a **pinned tab in edit mode**, caret in the body. The file
  passes `veri check` before the user types anything (REQ-009 AC).

## States and interactions summary
| Element | State | Behavior |
|---|---|---|
| Mode toggle | edit active | ember tint; editor mounted |
| Tab | dirty | × → ember dot; close prompts Save/Discard/Cancel |
| Guarded line | edit attempt | amber flash 300ms + status-row notice 3s |
| Editor | file changed, clean | silent reload + status note |
| Editor | file changed, dirty | conflict banner until resolved |
| `[[` popover | open | caret-anchored, keyboard navigable |
| Status row | after ⌘S | `saved`, fades 1.5s |
| Read mode | dirty buffer exists | amber "viewing saved version" strip |

## Edge cases
- **Huge documents**: CM6 virtualizes; no special handling needed.
- **Malformed frontmatter typed by the user**: saves fine (file is the
  truth); guard ranges are recomputed on every parse — if frontmatter no
  longer parses, guards degrade to blocking edits on any line matching
  `^id:` / `^approved:` inside the fence region.
- **Deleting the whole frontmatter**: allowed except the guarded lines,
  which refuse deletion (amber flash). A doc without frontmatter is a
  `veri check` problem, not an editor problem.
- **File deleted on disk while open**: banner `⚠ file was deleted` with
  **Restore** (rewrites buffer to disk) / **Close tab**.
- **Read-only filesystem / write error**: status row shows the error in
  amber, buffer stays dirty; nothing is lost.

## Accessibility
- The editor is a standard CM6 `contenteditable` region: focus lands on
  it from the tab strip via Tab; Esc then Tab exits (CM6
  `tabindex` escape hatch) so keyboard users are not trapped.
- Mode toggle, popovers, and banners are buttons/dialogs with visible
  focus rings (2px `rgba(232,112,58,0.4)` outline) and aria-labels
  (`Switch to edit mode`, `Unsaved changes dialog`).
- Guard rejections announce via an `aria-live=polite` region mirroring
  the status-row notice.
- All color signals (dirty dot, guarded ghost text, amber warnings) are
  paired with text or tooltips; nothing is color-only.

## State management
Extends the tab model from `design/document-tabs/`:
- Per document tab: `mode: 'read' | 'edit'`, `dirty: boolean`,
  `buffer: string | null` (null when clean → file is authoritative),
  `conflict: 'none' | 'disk-changed' | 'deleted'`, per-mode scroll,
  caret position.
- Editor buffers survive tab switches (kept in tab state, CM6 instance
  may be recreated); they do **not** survive app restart in v1.
- Save path: renderer → IPC → main process writes via core; the
  `updated:` bump and guard validation live main-side so the CLI/MCP and
  UI share one write path.

## Design Tokens
Inherited unchanged from `design/README.md`; this spec introduces **no
new colors, fonts, or radii**. Editor-specific applications above
(selection tint, guarded ghost text, warning banner) all reuse canon
values.

## Files
- `README.md` — this spec (self-sufficient; the prototype illustrates it)
- `editor-prototype.html` — interactive prototype. Try: the read/edit
  toggle or ⌘E; typing anywhere (dirty dot, status row, ⌘S to save);
  typing on the `id:`/`approved:` lines (guard flash + notice); `[[`
  in the body (autocomplete); the sidebar `+` or ⌘N (creation flow);
  closing a dirty tab (Save/Discard/Cancel); and the "simulate external
  edit" control bottom-right (silent reload when clean, conflict banner
  when dirty).
