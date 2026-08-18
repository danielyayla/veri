---
id: WO-043
type: work-order
title: An accessibility floor across the renderer
status: done
created: 2026-08-18
updated: 2026-08-18
links:
  - id: REQ-020
    rel: implements
  - id: SRC-019
    rel: designed-by
---

## Summary

The renderer has zero ARIA attributes, no focus rings, and almost every
control is a `<div onClick>` — a keyboard-only user cannot approve a
document, switch a work order's status, or close a tab. Bring the whole
UI up to the floor REQ-020 sets: real interactive elements, visible
focus, correct roles with focus trapping, live announcements where the
canon already requires them, and no color-only state.

## In scope

- Converting every interactive control to a real `<button>`, `<a>`, or
  input — or an explicit role with keyboard activation.
- Visible focus states everywhere, with tab order following visual
  order in the sidebar, type panel, tabs, reader, and popovers.
- Correct roles for the palette, popovers, and menus
  (`dialog`/`menu`/`listbox`), focus trapped while open and restored on
  close; Escape always closes the topmost layer.
- `aria-live` announcements for guard rejections and copy
  confirmations, per the design canon.
- A non-color channel (text or shape) for every state a colored dot or
  chip encodes — the advisory-surfacing hollow/filled rule generalized.
- Keyboard-only end-to-end coverage of the approve flow, work-order
  status control, tab management, and link navigation.

## Out of scope

- New interactions or layout changes — this order changes semantics and
  focus behavior, not the design.
- Screen-reader testing beyond roles/labels/live regions (a full AT
  audit is later work).
- The editor's internal CodeMirror keymap.

## Requirements

Implements [[REQ-020]] — fundamentals, not polish: the floor the design
canon sets per-bundle, made product-wide.

## Before starting

This is UI work: DEC-012 requires a `designed-by` link before this
order leaves backlog. [[SRC-008]]'s accessibility section is the canon
to generalize; a focus/roles addendum bundle may be the right artifact.

## Acceptance tests

- [x] Every interactive control is a real button/link/input or carries
      an explicit keyboard-activatable role.
- [x] Every focusable element shows a visible focus state; tab order
      matches visual order across the named surfaces.
- [x] Palette, popovers, and menus have correct roles, trap focus, and
      restore it on close; Escape closes the topmost layer.
- [x] Guard rejections and copy confirmations announce via `aria-live`.
- [x] No state is color-only.
- [x] Approve, status change, tab management, and link navigation each
      complete start-to-finish with the keyboard alone, covered by UI
      tests. Full suite and `veri check` clean.

## Receipts

- 2026-08-18 — b1e182c — packages/ui/src/renderer (a11y.ts + a11y.test.ts
  new, dom.ts, app.ts, widgets.ts, all twelve views),
  packages/ui/renderer/styles.css — accessibility floor per [[SRC-019]]:
  every control a real `<button>` (btn-reset, visually inert), focus
  captured/restored across the replaceChildren rebuild by stable
  data-fkey, one layer stack (dialog/alertdialog/menu/combobox roles,
  trap, Escape-topmost, invoker restore), one polite live region fed by
  guard rejections and copy confirmations, tablist + status radiogroup
  with roving tabindex, `:focus-visible` ring generalized from SRC-008,
  non-color channels for dirty/broken/health states; 299 tests pass
  (ui 143→157), `veri check` clean, all four keyboard flows (approve,
  status change, tab management, link navigation) verified end-to-end
  in the headless Electron harness against a scratch project (agent
  session, Claude Code)
