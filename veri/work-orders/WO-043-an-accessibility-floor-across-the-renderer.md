---
id: WO-043
type: work-order
title: An accessibility floor across the renderer
status: in-progress
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

- [ ] Every interactive control is a real button/link/input or carries
      an explicit keyboard-activatable role.
- [ ] Every focusable element shows a visible focus state; tab order
      matches visual order across the named surfaces.
- [ ] Palette, popovers, and menus have correct roles, trap focus, and
      restore it on close; Escape closes the topmost layer.
- [ ] Guard rejections and copy confirmations announce via `aria-live`.
- [ ] No state is color-only.
- [ ] Approve, status change, tab management, and link navigation each
      complete start-to-finish with the keyboard alone, covered by UI
      tests. Full suite and `veri check` clean.

## Receipts

(none yet)
