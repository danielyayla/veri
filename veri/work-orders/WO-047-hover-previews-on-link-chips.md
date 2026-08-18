---
id: WO-047
type: work-order
title: "Hover previews on link chips"
status: in-progress
created: 2026-08-18
updated: 2026-08-18
links:
  - id: REQ-004
    rel: implements
  - id: REQ-020
    rel: constrained-by
  - id: SRC-021
    rel: designed-by
  - id: SRC-016
    rel: derived-from
---

## Summary

Resting on a [[ID]] chip answers "do I need to go there?" without navigating — the missing half of context preservation after [[WO-039]] made navigation reversible. One popover implementation in packages/ui widgets.ts attached wherever idChip renders, per [[SRC-021]]: header row (id, type chip, status chip), title, first-section excerpt in the muted treatment, with 350ms-in/150ms-out hover timing and full keyboard-focus parity.

## In scope

- One popover component in widgets.ts, shown for idChip everywhere it renders (reader body, work-order detail, panels; Connections cards on their id only)
- Content: id in type color + type chip + status chip, title, first two blocks of the first section rendered muted with inert refs
- Trigger: 350ms uninterrupted hover in, 150ms out counting chip and popover together; scroll, click, and tab-switch dismiss immediately; one popover globally
- Keyboard parity (REQ-020): focus shows the same popover on the same delay, blur or Escape dismisses, Escape keeps focus in place
- Popover is aria-hidden presentation, never focusable, never intercepting clicks
- Positioned below the chip, flipped above at viewport clip, fixed width matching the Connections card, ~6-line fade truncation
- No popover on broken-link chips
- Colocated tests for the trigger state machine and content assembly

## Out of scope

- Previews on palette rows
- Interactive popovers (buttons, links, pinning) — the chip stays the only affordance
- Changes to chip visuals or click/⌘-click navigation semantics (SRC-018 canon)
- New colors or tokens

## Requirements

- [[REQ-004]] — implements
- [[REQ-020]] — constrained-by
- [[SRC-021]] — designed-by
- [[SRC-016]] — derived-from

## Acceptance tests

- [x] Hovering a body chip for 350ms shows id, type, status, title, and the first-section excerpt; a quick pass over a trail of chips shows nothing
- [x] Moving from chip into the popover keeps it open; leaving both closes it after 150ms
- [x] Focusing a chip with the keyboard shows the same popover; Escape dismisses without moving focus
- [x] Broken-link chips never show a popover
- [x] The popover never clips off-screen: it flips above the chip at the viewport edge
- [x] npm test passes; veri check reports zero issues

## Receipts

(none yet)
