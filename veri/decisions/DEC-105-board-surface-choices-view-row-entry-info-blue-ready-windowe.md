---
id: DEC-105
type: decision
title: "Board surface choices: panel-row entry, info-blue ready, windowed DONE, stamp-gated segment"
status: active
approved: 2026-08-25
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

Four choices made implementing WO-103 against SRC-047 (choice 1 revised 2026-08-25 after Daniel's design critique): (1) the Work Orders collection row stays a panel toggle like every other collection; the type panel gains a `▤ Board` row at the top of its list that opens the ▤ Board view tab — the panel is the collection's default surface, the board its alternate view. (2) `ready` colors as the info blue (`var(--t-req)` in STATUS_COLORS) everywhere a status renders. (3) The board's DONE column windows to the 5 most recently updated (`BOARD_DONE_WINDOW`) behind a `▸ show all N done` expander; living columns render in full, ordered by ascending id — the DEC-097 dispatch order. (4) The work-order detail's segmented control renders `ready` as a visible but stamp-gated segment: dimmed, never a click target, announcing "entered via veri approve" — the stamp remains the only write path into ready (DEC-096).

## Rejected alternatives

- **Split row (label opens board, caret toggles panel)** — two targets on one 28px row is a mis-click trap and needs nested-button markup the a11y floor forbids; rejected.
- **Collection row as a view row (click opens the board directly)** — the initial implementation, reversed by Daniel's 2026-08-25 critique: it made one of four identical collection rows a route while three stayed browsers, and dropped the panel's search and status subgroups from the sidebar path. One click deep behind a consistent gesture beats zero clicks behind an inconsistent one; rejected.
- **A List | Board segmented control inside one Work Orders tab** — requires a full-width list view duplicating the type panel, which SRC-014 defers ("the panel is a launcher, not a table") and SRC-025 retired the first board for restating; rejected.
- **Amber for ready** — reads as draft/proposed/warning and a whole column of amber reads as failure; green collides with done/accepted; rejected.
- **Uncapped or paginated DONE** — uncapped is the exact SRC-025 failure; pagination is heavier than the panel's proven expander idiom; rejected.
- **Hide ready from the segmented control entirely** — a ready work order would show no active segment, making the control read as broken; rejected.
- **Drag-and-drop status moves** — WO-103 out of scope; stamped promotions cannot be a drag; rejected.

## Rationale

The original directive ("clicking Work Orders should open a tab containing a Kanban board") produced the view-row entry; Daniel's same-day critique reversed it: collections are browsers, view rows are routes, and Work Orders must not be the one collection that breaks the rule. The panel — search, PINNED, status subgroups, done expander — is the collection's default surface, and the `▤ Board` row promotes to the workflow view; the ⌘K palette's "▤ Board" row remains the direct path. Note: the 2026-08-25 approval stamp predates this revision of choice 1 — re-stamp wanted. Info blue matches the existing `--info-*` register and keeps amber meaning draft/warning and green meaning done. Windowing answers SRC-025's scale objection (an uncapped DONE killed the first board); ascending-id living columns make READY read top-down as what `veri next` hands out. Rendering ready in the segmented control keeps the four-state lifecycle visible on the detail without opening a UI bypass around the approval stamp.
