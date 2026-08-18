---
id: SRC-019
type: source
title: "Design — An accessibility floor across the renderer"
status: imported
created: 2026-08-18
updated: 2026-08-18
links:
  - id: REQ-020
    rel: designs
  - id: SRC-008
    rel: builds-on
  - id: SRC-016
    rel: informed-by
  - id: DEC-008
    rel: constrained-by
  - id: DEC-012
    rel: constrained-by
---

> **Pending Daniel's approval.** Drafted 2026-08-18 by an agent session
> (Claude Code) for [[WO-043]], per the DEC-012 design gate. The
> handoff spec lives in `design/accessibility-floor/` (written spec
> only, no prototype: the change is semantics and focus behavior, not
> visuals).

Brings the whole renderer up to the floor [[REQ-020]] sets: real
interactive elements, visible focus, correct roles with trapping, live
announcements, and no color-only state. Generalizes the accessibility
section of [[SRC-008]] — the only bundle that has one — into
product-wide rules; the [[SRC-016]] critique's "missing fundamentals"
finding is the evidence base. Implemented by [[WO-043]].

## The central problem

The renderer ([[DEC-008]]) rebuilds the entire DOM from state with
`replaceChildren` on every update — so even after every control becomes
a real `<button>`, keyboard focus would be destroyed by the very state
change the keypress caused. The design's spine is a focus-restoration
pass symmetric to the scroll capture `render()` already does: every
focusable element carries a stable `data-fkey` (identity-derived, not
position-derived), the active element's fkey is captured before the
rebuild and re-focused after, with nearest-sibling fallback when the
element is gone. Without this, none of the keyboard flows survive
their own first keystroke.

## The five rules

1. **Real controls** — every `onClick` `<div>`/`<span>` becomes a
   `<button>` through a visually inert `btn-reset` class (audit at
   drafting: ~101 click sites, 9 real buttons, zero ARIA). Icon-only
   controls get `aria-label`s naming object and action.
2. **Focus survives the rebuild** — the fkey mechanism above.
3. **One layer stack** — palette, sheets, popovers, and menus join a
   single ordered stack: correct roles (`dialog` / `alertdialog` /
   `menu` / combobox-listbox for the palette), focus trapped while
   open, restored to the invoker (by fkey) on close, Escape closes the
   topmost. The type panel is a pane, not a layer: in the Escape
   stack, never trapping.
4. **One live region** — a single visually-hidden `aria-live=polite`
   region with an `announce()` helper, fed only where the canon
   already requires it: editor guard rejections (SRC-008), copy
   confirmations, and the existing toast (which also becomes
   `role=status`).
5. **No color-only state** — the advisory-surfacing filled/hollow rule
   generalized. Most signals already carry text or shape; the fixes
   are the tab dirty state entering the tab's accessible name, a `⚠`
   glyph on broken link chips, and `aria-label`s mirroring hover-only
   titles on health dots.

Composite widgets get standard patterns: tab strip = `tablist` with
roving tabindex (close × stays a nested real button — pragmatic
VS Code-style deviation, noted in the bundle), work-order status
control = `radiogroup`, mode toggle = `aria-pressed` button pair,
sidebar = `<nav>` with plain DOM-order tab stops.

## Verification shape

Pure logic (focus order, trap cycling, fkey resolution, announcement
formatting) lands in `a11y.ts` under node:test; the four acceptance
flows (approve, status change, tab management, link navigation) are
driven end-to-end in the headless Electron harness with dispatched
`KeyboardEvent`s — navigation keys only, no simulated typing.

## Deferred

Full AT audit, CodeMirror's internal keymap, skip links, reduced
motion, high-contrast theming — polish beyond the floor.

New tokens: one — the SRC-008 focus ring (2px `rgba(232,112,58,0.4)`,
offset 1px) generalized to every focusable via `:focus-visible`. No
new colors, no layout changes.
