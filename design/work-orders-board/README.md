# Handoff: Work Orders Board (SRC-047)

## Overview
Clicking the **Work Orders** collection in the sidebar opens a
**▤ Work Orders view tab** — a four-column Kanban over the full
work-order lifecycle (`backlog · ready · in-progress · done`). This
deliberately revisits the board retired by [[SRC-025]] (WO-053), and it
is the UI surface for the `ready` dispatch state that WO-098's receipt
explicitly deferred ("surface the ready state in the desktop UI").

**Status: approved by Daniel 2026-08-25.** SRC-025 was a stamped ruling
("fold it"); this design reopens it on Daniel's initiative — the board
returns as a *tab*, not a sidebar view row. Implementation proceeds as
WO-103 under the DEC-012 design gate (`rel: designed-by` → SRC-047).

## Answers to SRC-025
SRC-025 retired the old board for three reasons. Each is answered:

1. *"A read-only restatement of the Work Orders panel."* The panel
   shows two living groups; the board is the first surface that shows
   the whole four-status lifecycle at once — including the new `ready`
   lane, which exists nowhere in the UI today.
2. *"Dies at scale — a DONE column with 380 cards, uncapped."* DONE is
   windowed to the five most recently updated, with a `▸ show all N
   done` expander (mono, ghost, row-hover). Living columns render in
   full; the lifecycle keeps them small.
3. *"Card extras restate the detail view."* Cards carry only what no
   other surface shows at a glance: mono type-colored id, title, a
   recency line (`updated Nd ago`), and — on done cards — the receipt
   SHA (`✓ abc1234`, green). The filled amber dot marks a `veri check`
   issue (filled = issue, hollow = advisory, per SRC-010).

## Entry point
The collection row's click behavior changes: instead of only toggling
the type panel, clicking Work Orders opens the board as a **view tab**
(preview semantics, one instance, closeable — exactly how Home,
Search, and Settings open). The type panel remains available and
unchanged; the board is a second door, not a replacement. Open
question for approval: whether the collection click opens the board
directly or the type panel gains a `▤ Board` affordance.

## The ready lane
- `ready` is entered **only by the user's stamp** (`veri approve`,
  WO-098/DEC-096). No board control, and no segmented-control button,
  may perform `backlog → ready`.
- Proposed status color: the info blue (`--t-req` hue), matching the
  existing `--info-tint`/`--info-border` register. Rejected: amber
  (reads as draft/health warning), green (collides with done).
  `STATUS_COLORS` gains `ready`; `LIVING['work-order']` and
  `STATUS_SEGMENTS` need the same catch-up.
- Ready cards may show a `next up` marker on the work order `veri
  next` would dispatch.

## Layout
Inside the standard shell (44px topbar, 216px sidebar, 37px tab
strip): `.screen-board` padding 26px 28px; h1 20px/600 + mono count
line; grid `repeat(4, minmax(228px, 300px))`, gap 14px. Columns:
1px `--hair` border, radius 10px, `--panel`, padding 10px; head = 7px
status dot + uppercase mono 10.5px label (`letter-spacing .09em`) +
ghost count. Cards: `--card-2`, 1px `--card-border-2`, radius 8px,
padding 10px 12px; hover moves border to `--hover-border-2` only. No
shadows, no motion. In a split pane below ~640px the grid should fall
back to the type panel's stacked list (container query, `pane`).

## Out of scope
- Drag-and-drop. The work-order detail's segmented control remains the
  only status mutation (WO-053's ruling stands), and stamped
  promotions can never be a drag.
- Any change to the type panel, its subgroups, or the sidebar row
  anatomy.

## Accessibility
Columns are labeled `section`s; cards are real `<button>`s
(`.btn-reset .btn-block`), click = preview tab, double-click = pin;
focus-visible ring per SRC-019; the expander is a button, not a div.

## Design tokens
No new colors. The only new mapping is `ready → info blue`; everything
else reuses the shipped token blocks verbatim (the prototype embeds
both themes from `packages/ui/renderer/styles.css`).

## Files
- `Veri Work Orders Board.html` — static mockup (dark + light via
  `prefers-color-scheme`), sample data drawn from real repo documents
  (WO-098..101 with their actual statuses and receipt SHA).
  Published copy: https://claude.ai/code/artifact/a3c6f783-68e8-42da-a860-df668fdfac5f
- See `design/sidebar-navigation/` (shell, panel — unchanged) and
  `design/document-tabs/` (tab semantics — unchanged).
