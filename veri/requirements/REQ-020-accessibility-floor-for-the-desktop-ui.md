---
id: REQ-020
type: requirement
title: Accessibility floor for the desktop UI
status: draft
created: 2026-08-18
updated: 2026-08-18
links:
  - id: SRC-016
    rel: informed-by
  - id: REQ-004
    rel: extends
  - id: REQ-009
    rel: follows-from
---

The renderer currently has zero ARIA attributes, no focus rings, and
almost every control is a `<div onClick>` — only a handful of elements are
real buttons ([[SRC-016]], missing fundamentals). Keyboard access is
limited to the global shortcuts and the palette's arrow keys. The design
canon already takes accessibility seriously where it was specified
(SRC-008's editor bundle has a genuine accessibility section); this
requirement makes that floor product-wide rather than per-bundle.

This is a fundamentals requirement, not polish: a keyboard-only user
cannot currently approve a document, switch a work order's status, or
close a tab.

## Acceptance criteria

- [ ] Every interactive control is a real `<button>`, `<a>`, or input —
      or carries an explicit role and is keyboard-activatable.
- [ ] Every focusable element has a visible focus state; tab order follows
      visual order in the sidebar, type panel, tabs, reader, and popovers.
- [ ] The palette, popovers, and menus carry correct roles
      (`dialog`/`menu`/`listbox` as appropriate), trap focus while open,
      and restore focus on close; Escape always closes the topmost layer.
- [ ] Status and result changes announce via `aria-live` where the design
      canon already requires it (guard rejections, copy confirmations).
- [ ] Nothing is color-only: every state encoded by a colored dot or chip
      also reads through text or shape (the advisory-surfacing bundle's
      hollow/filled rule generalized).
- [ ] The approve flow, work-order status control, tab management, and
      link navigation are all operable start-to-finish with the keyboard.
