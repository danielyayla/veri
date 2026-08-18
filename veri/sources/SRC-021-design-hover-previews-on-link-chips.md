---
id: SRC-021
type: source
title: Design — Hover previews on link chips
status: imported
created: 2026-08-18
updated: 2026-08-18
links:
  - id: REQ-004
    rel: designs
  - id: REQ-020
    rel: constrained-by
  - id: SRC-018
    rel: builds-on
  - id: SRC-016
    rel: derived-from
  - id: DEC-012
    rel: constrained-by
---

> Drafted 2026-08-18 by an agent session (Claude Code) for the hover
> previews work order, per the DEC-012 design gate, under Daniel's P1
> implementation directive of 2026-08-18. Pending Daniel's review.
> Written spec only — one popover, one trigger rule.

The core reading act is following WO → REQ → DEC → SRC trails
([[SRC-016]]). [[SRC-018]] made following a link reversible; this
makes it **avoidable**: resting on a `[[ID]]` chip answers "do I need
to go there?" without navigating, Obsidian-style.

## The popover

One implementation in `widgets.ts`, attached wherever `idChip`
renders — reader body, work-order detail, panels. It shows, top to
bottom:

- **Header row**: the id in its type color, the type chip, the status
  chip — the same vocabulary as the frontmatter card, so the preview
  is a miniature of the doc head, not a new design.
- **Title** in the doc-title register, smaller.
- **Excerpt**: the body's first two blocks (first section, before any
  `##` heading), rendered with the existing muted block treatment.
  Refs inside the excerpt render as inert colored text, not chips — a
  preview previews one hop, it does not become a navigation surface.
- Nothing else. No buttons: the chip itself is the affordance
  (click navigates, ⌘-click background-opens — unchanged).

Fixed width matching the Connections card; max ~6 text lines,
truncated with a fade. Positioned below the chip, flipped above when
the viewport clips it, never overlapping the chip itself.

## Trigger rules

- **In**: 350 ms of uninterrupted hover — a pause, not a pass-through;
  trails of chips must not strobe. **Out**: 150 ms after the pointer
  leaves chip and popover both (the popover may be hovered to finish
  reading a clipped line, but entering it never pins it).
- **Keyboard parity** ([[REQ-020]]): focusing a chip shows the same
  popover on the same delay; blur or Escape dismisses it. Escape
  dismisses without moving focus.
- The popover is presentation only — `aria-hidden`, never
  focus-trapping, never intercepting clicks; screen readers already
  get the full target via each chip's existing label.
- Broken-link chips (`chip-broken`) show no popover — there is nothing
  to preview and the amber treatment already explains itself.
- One popover globally; opening another closes the last. Scroll,
  click, and tab-switch dismiss immediately.

## Everything unchanged

Chip visuals, click/⌘-click semantics ([[SRC-018]] navigation model),
Connections cards (which already carry title + why and gain the same
popover only on their id, not the whole card), palette rows (a
transient list — no previews there), tokens and colors.
