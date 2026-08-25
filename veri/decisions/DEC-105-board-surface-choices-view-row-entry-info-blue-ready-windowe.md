---
id: DEC-105
type: decision
title: "Board surface choices: view-row entry, info-blue ready, windowed DONE, stamp-gated segment"
status: proposed
created: 2026-08-25
updated: 2026-08-25
links:
  - id: WO-103
    rel: constrains
  - id: SRC-047
    rel: derived-from
  - id: DEC-096
    rel: consistent-with
  - id: DEC-097
    rel: consistent-with
---

## Choice

Four choices made implementing WO-103 against SRC-047: (1) the Work Orders collection row becomes a view row — clicking it opens the ▤ board tab and the row drops its panel caret; the Work Orders type panel stays reachable via the live type crumb (openPanel), and every other collection keeps its toggle. (2) `ready` colors as the info blue (`var(--t-req)` in STATUS_COLORS) everywhere a status renders. (3) The board's DONE column windows to the 5 most recently updated (`BOARD_DONE_WINDOW`) behind a `▸ show all N done` expander; living columns render in full, ordered by ascending id — the DEC-097 dispatch order. (4) The work-order detail's segmented control renders `ready` as a visible but stamp-gated segment: dimmed, never a click target, announcing "entered via veri approve" — the stamp remains the only write path into ready (DEC-096).

## Rejected alternatives

- **Split row (label opens board, caret toggles panel)** — two targets on one 28px row is a mis-click trap and needs nested-button markup the a11y floor forbids; rejected.
- **Keep the row a panel toggle, add a `▤ Board` affordance inside the panel** — buries the board a click deep and contradicts the user's stated gesture; rejected.
- **Amber for ready** — reads as draft/proposed/warning and a whole column of amber reads as failure; green collides with done/accepted; rejected.
- **Uncapped or paginated DONE** — uncapped is the exact SRC-025 failure; pagination is heavier than the panel's proven expander idiom; rejected.
- **Hide ready from the segmented control entirely** — a ready work order would show no active segment, making the control read as broken; rejected.
- **Drag-and-drop status moves** — WO-103 out of scope; stamped promotions cannot be a drag; rejected.

## Rationale

The user's directive was "clicking Work Orders should open a tab containing a Kanban board" — a view row, not a panel toggle, honors that directly; the crumb keeps the panel one click away without a second affordance on the row. Info blue matches the existing `--info-*` register and keeps amber meaning draft/warning and green meaning done. Windowing answers SRC-025's scale objection (an uncapped DONE killed the first board); ascending-id living columns make READY read top-down as what `veri next` hands out. Rendering ready in the segmented control keeps the four-state lifecycle visible on the detail without opening a UI bypass around the approval stamp.
