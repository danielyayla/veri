# Handoff: New-project flow in the UI (SRC-007)

## Overview
The desktop app can only *open* a project that already has a `veri/`
directory. A first-time user hits a dead end and must drop to a terminal for
`veri init`. This handoff designs the missing creation path: two entry
points ("New project…" in the project switcher and in the command palette),
a native directory picker, a small **New project sheet** with a demo-seed
toggle, and the three outcome states (created, already-a-project, scaffold
failed).

Scope is exactly [[WO-018]]. This design adds no new screens, no new tokens,
and no onboarding/tour surface — only two rows, one modal sheet, and one
notice variant on top of the surfaces that already exist.

## About the Design Files
`new-project-flow.html` in this bundle is a self-running design reference
(open it in a browser; the scenario bar at the top switches states), not
production code. Recreate it in `packages/ui`'s existing vanilla-TypeScript
renderer patterns per DEC-008. Do not ship the HTML.

## Fidelity
High-fidelity. Colors, typography, spacing, and copy are final. Every token
used here already exists in `packages/ui/renderer/styles.css` (`--pop`,
`--hair`, `--int-border`, `--amber`, `--green`, `--ember`, `--faint`, …);
this design introduces no new ones.

## Non-negotiable principles
- **Files are the source of truth (DEC-002).** Creating a project is
  writing directories and files to disk, nothing else. There is no
  app-side project registry beyond the MRU cache (DEC-010), and the MRU is
  never the record of a project's existence.
- **One scaffold implementation (DEC-009 reuse pattern).** The sheet calls
  the same core function `veri init` calls. The UI must not know the shape
  of the tree it creates; it only reports what the function did. If the
  two ever produce different bytes, that is a bug, not a design variant.
- **The demo is the shipped files (DEC-007).** The toggle copies
  `packages/cli/demo/veri/` verbatim, exactly as `veri init --demo`. The
  sheet must not describe the demo as "example content generated for you".
- **Never destroy, never half-write.** A folder that already contains
  `veri/` is opened, never re-scaffolded. A failed scaffold leaves the MRU
  list and the open project untouched.
- **A non-empty folder is fine.** Veri lives alongside code. The sheet must
  not warn about existing files; only an existing `veri/` changes behavior.

---

## Surface 1 — Project switcher popover

The existing popover (`.proj-pop`, 300px, `--pop` background, 8px radius)
keeps its PROJECTS list and divider unchanged. Below the divider it now
carries **two** rows instead of one, both using the existing
`.proj-open-row` idiom (7px/8px padding, 6px radius, `--secondary` 13px,
hover `#1F1F25`, right-aligned `.proj-kbd` chip):

```
PROJECTS
  ● veri            12 docs · 1 issue        ✓
  ● skiff           16 docs
─────────────────────────────────────────────
  →  Open project folder…                  ⌘O
  +  New project…                         ⇧⌘N
```

- **Order.** Open stays first, in its current position — existing users
  have muscle memory for it. New project is second.
- **Glyph swap.** "Open project folder…" moves from `+` to `→`; `+` is
  reassigned to "New project…", where it means what it says. This is the
  one change to an existing element in this design, and it is required:
  two adjacent rows cannot both be `+`. Both glyphs use the existing
  `.proj-open-plus` box (14px wide, centered, mono 11px, `--faint`).
- **Shortcut.** `⇧⌘N`, rendered in the same `.proj-kbd` chip as `⌘O`, and
  bound globally alongside it (the existing `⌘O` handler in `app.ts`'s
  keydown block is the pattern). `⇧⌘N` works whether or not the popover is
  open; opening it closes the popover first, exactly as `⌘O` does.

## Surface 2 — Command palette

The palette (SRC-005 layer 2) currently mixes two row kinds, `doc` and
`view`. This design adds a third: **`command`**.

- Row anatomy is the `view` row verbatim: `.pal-chip` holding the glyph
  `+` (chip background/border unchanged from the view-row treatment),
  `.pal-title` "New project…", and — in the `.pal-status` slot — the word
  `command` in `#55525E`, the same faint tone view rows use.
- **Matching.** Matches the query text `new`, `project`, or `create`
  (substring, case-insensitive, same comparison the view rows use against
  their label). Score `58` on a text match — identical to a view-label
  match, so a doc titled with the query still outranks it.
- **Empty query.** Unlike views, the command row does **not** appear on an
  empty palette. The empty palette is a recents/navigation surface; a
  project-creating action there is noise and a mis-Enter hazard.
- **Filters.** Suppressed whenever a type or status filter is active
  (`req:`, `is:proposed`, …), by the same rule that suppresses view rows —
  filters talk about documents, not commands.
- **Activation.** `↩` closes the palette and starts the flow at the
  directory picker. `⌘↩` (the "open in background/pinned" modifier) is not
  meaningful here and behaves as plain `↩`.

## Surface 3 — The flow

```
entry point ─▶ native directory picker ─▶ ┬─ folder has veri/ ─▶ open it + notice
                     (cancel ⇒ nothing)   └─ otherwise ─▶ New project sheet
                                                              │
                                            cancel ⇒ nothing ─┤
                                                              ▼
                                                    scaffold ─┬─ ok ─▶ MRU + open (Home)
                                                              └─ fail ─▶ error in sheet
```

The picker comes **first**, before any Veri-specific UI. Rationale: the
directory is the only required input and the OS picker is the fastest way
to give it; asking for a demo toggle before the user has committed to a
location would be a modal about nothing. Native dialog config matches the
existing open-folder handler (`properties: ['openDirectory']`), with
`title: 'Choose a folder for the new project'` and
`buttonLabel: 'Choose'`.

## Surface 4 — The New project sheet

A centered modal over a scrim, reusing the palette's modal chrome:
`.pal-scrim` (full-bleed `rgba(0,0,0,.5)`) and a panel with `--pop`
background, 1px `#2B2B32` border, 10px radius,
`box-shadow: 0 12px 32px rgba(0,0,0,.5)`. Width **460px**, padding 18px.
Dismiss on `esc` and scrim click — same as the palette.

### Anatomy, top to bottom

1. **Label.** `NEW PROJECT` — `.micro-label` (mono 10px, `.1em` tracking,
   `--faint`), 12px bottom margin.

2. **Location block.** The chosen path, mono 12px `--body-text`, on
   `--bg` inside 1px `--int-border`, 6px radius, 8px/10px padding.
   Head-truncate with a leading `…` when it overflows (the tail — the
   folder name — is the informative end). Right-aligned inside the block:
   a `Change…` text button (11.5px `--faint`, hover `--secondary`) that
   re-opens the native picker.

3. **Name line.** `Project name` label (11.5px `--muted`) and the derived
   name (mono 12px `--text`) — the folder's basename, which is what the
   MRU stores (DEC-010). **Read-only.** Renaming a project is not in
   WO-018's scope, and a name that disagrees with the folder would be
   app-side state the files don't carry (DEC-002).

4. **Demo toggle.** A row: a 28×16px pill switch (track `--int-border`
   off / `--green` on, 12px white-ish knob, 120ms ease) + label
   `Seed with the skiff demo project` (13px `--body-text`), with a
   sub-line (11.5px `--muted`):
   `16 documents from a sample invoicing app — the same content
   veri init --demo installs.`
   **Default: off.** An empty project is the honest default for someone
   creating their own; the demo is opt-in exploration.

5. **What-will-be-written preview.** A mono 11.5px `--faint` block on
   `--bg`, 1px `--hair`, 6px radius, that re-renders when the toggle
   flips. This is the sheet's real work: it makes the write legible
   before it happens, the same contract the approval popover keeps
   (SRC-006).

   Toggle **off**:
   ```
   veri/requirements/
   veri/decisions/
   veri/work-orders/
   veri/sources/
   ```
   Toggle **on**:
   ```
   veri/  ·  16 documents
   README.md      ← skipped if one already exists
   CLAUDE.md      ← skipped if one already exists
   ```
   The `← skipped if one already exists` annotations (`--ghost`) are
   required: `COPYFILE_EXCL` behavior per DEC-007 is surprising if
   undisclosed.

6. **Actions.** Right-aligned pair, 8px gap. `Cancel` — ghost button,
   12.5px `--secondary`, transparent background, 1px `--int-border`,
   6px radius, hover border `--hover-border`. `Create project` — primary,
   12.5px, `--ember` background, `#141416` text, 6px radius, hover
   `#F0854F`. Enter activates the primary.

7. **Busy state.** On submit, the primary becomes `Creating…`, both
   buttons disable, and the toggle locks. No spinner — scaffolding is a
   handful of `mkdir`s and a `cpSync`; a spinner would flash.

## Surface 5 — Outcomes

### Created
The sheet closes. The project is prepended to the MRU with a fresh
round-robin accent color (DEC-010), the app re-points at the new root, and
it opens with the **Home** view as any project open does. No success toast:
the window title, the switcher swatch, and Home's contents are the
confirmation. A brand-new empty project's Home shows its existing
zero-state — unchanged by this work order.

### Already a Veri project
No sheet is shown. The folder opens immediately, and a **project notice**
appears anchored under the topbar for 5 seconds (then fades over 200ms;
dismissed early by click, `esc`, or any topbar interaction — the same
dismissal wiring `projectError` already has).

Geometry is the existing `.proj-err` chip verbatim (`top: 34px; left: 26px`,
max-width 380px, `--pop`, 8px radius, 12.5px/1.4), in a **neutral** variant:
border `#243024`, dot and text `--green`. Copy, exact:

> **Opened the existing project — `veri/` was already here, nothing was
> written.**

Rationale for opening rather than blocking: WO-018 fixes this outcome
("a chosen directory that already contains `veri/` is opened, not
re-scaffolded"), and it is what the user wants nine times in ten. The
notice exists so "created" and "opened" are never confused.

### Scaffold failed
The sheet **stays open** and grows an error line above the actions: a 6px
`--amber` dot + 12.5px `--amber` text, on `rgba(217,160,63,0.06)`, 1px
`#3A3020`, 6px radius, 9px/12px padding. Copy:

> **Couldn't create the project — {message}. Nothing was written, and your
> project list is unchanged.**

`{message}` is the raw error message from the scaffold call (e.g.
`EACCES: permission denied, mkdir '/opt/thing/veri'`), rendered mono 11.5px
on its own line beneath the sentence when it exceeds ~60 characters.
Buttons re-enable; `Change…` lets the user pick a writable folder without
retyping anything. The MRU is written **only after** a successful scaffold —
never before, never optimistically.

## States checklist for implementation
1. Switcher popover with both rows (`→ Open` / `+ New`).
2. Palette with the command row present (typed query) and absent (empty
   query, and under an active filter).
3. Sheet, demo off — four-line tree preview.
4. Sheet, demo on — demo preview with skip annotations.
5. Sheet, busy — `Creating…`, controls disabled.
6. Sheet, error — error line, controls re-enabled.
7. Notice — already-a-project, green variant.

All seven are in `new-project-flow.html` behind the scenario bar.

## Deliberately not designed
Per WO-018's out-of-scope list: no template picker beyond empty/demo, no
git init affordance, no onboarding tour, and no changes to CLI flags or the
MCP server. Also excluded by this design specifically: no project renaming,
no "recent folders" list inside the sheet (the OS picker has its own), and
no removal of projects from the MRU.
