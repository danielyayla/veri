---
id: WO-061
type: work-order
title: "Document-view critique fixes — contrast floor, linked-card ID navigation, header control de-twinning"
status: done
created: 2026-08-19
updated: 2026-08-19
links:
  - id: REQ-020
    rel: constrained-by
  - id: REQ-004
    rel: extends
  - id: DEC-012
    rel: constrained-by
  - id: WO-060
    rel: follows-from
  - id: SRC-033
    rel: designed-by
---

## Summary

Fixes the three priority findings from the 2026-08-19 design critique of the document view (work-order and reader variants). First, the dark palette's low-contrast text tokens fail the REQ-020 spirit and WO-060's own "contrast holds" acceptance test: `--faint` #6E6B76 measures ~3.7:1 on `--bg` #0F0F11 yet is used at 10–11px for breadcrumbs, micro-labels, wo-meta dates, and the inactive status segments (interactive controls), and `--ghost` #55525E measures ~2.5:1 on the activity timestamps. Second, in Linked requirements/decisions cards the document ID is a plain span inside the disclosure button, so clicking an ID toggles the row instead of navigating — the one place the app's ID-chip grammar lies to the user. Third, the read|edit mode toggle and the backlog/in progress/done status control are visual twins (bordered mono 11px segments, ember-tinted active) stacked ~30px apart in the header, putting an instant, undo-less file mutation one misclick below a benign view toggle; the mode toggle is also ~21px tall, under the 24px WCAG 2.5.8 target minimum.

## In scope

- Raise `--faint` to a value meeting 4.5:1 on `--bg` (≈#7E7B87) in the dark token block, with a matching light-palette adjustment so both modes hold the floor; coordinate with WO-060's token sweep rather than duplicating it.
- Stop using `--ghost` for information-bearing text: activity timestamps (`.act-time`) move to a passing token; `--ghost` remains available for decorative glyphs only.
- Render the ID in `linkedCard` (packages/ui/src/renderer/views/workorder.ts) as a real `idChip` with `stopPropagation`, so IDs navigate while chevron and title keep toggling the disclosure.
- De-twin the header controls: restyle the read|edit mode toggle as a quieter control (or relocate it) so it no longer mirrors the status radiogroup's bordered-segment treatment, and bring its hit target to at least 24px tall.
- Add an undo affordance for status changes: a toast naming the transition with a one-click revert.

## Out of scope

- The rest of the WO-060 light-palette/token sweep — only the two failing tokens named here.
- Unifying the WO metadata line with the reader frontmatter card (links editor on work orders) — worth its own work order.
- Redesigning the status renderings in linked cards, the Pin chip alignment/width shift, and activity-feed collapsing — noted in the critique as lower priority.
- Any change to status semantics or the write path — only presentation and undo.

## Requirements

- [[REQ-020]] — constrained-by
- [[REQ-004]] — extends
- [[DEC-012]] — constrained-by
- [[WO-060]] — follows-from

## Acceptance tests

- [x] `--faint` and every token used for text at or below 12px measures ≥ 4.5:1 against its background in both dark and light palettes.
- [x] Activity timestamps no longer use `--ghost`; no information-bearing text remains below 4.5:1 in the document view.
- [x] Inactive status segments (backlog/done when not current) meet 4.5:1.
- [x] Clicking an ID in a Linked requirements/decisions card opens that document (⌘-click backgrounds it); clicking the chevron or title still toggles the disclosure.
- [x] The read|edit toggle is visually distinct from the status radiogroup and its hit target is ≥ 24px tall.
- [x] Changing a work order's status shows an undo toast; activating undo restores the prior status and the file on disk matches.
- [x] `veri check` and `npm test` are clean.

## Receipts

- 2026-08-19 — d72b0cc — packages/ui/renderer/styles.css, packages/ui/src/renderer/app.ts, packages/ui/src/renderer/views/workorder.ts — claude-code session: all three critique fixes per SRC-033. Contrast: dark `--faint` #6E6B76→#86838F, light #8A8792→#6B6873 — SRC-033 suggested ≈#7E7B87, but faint text sits on elevated surfaces (frontmatter card, popovers), and #7E7B87 measures only 4.19:1 on `--pop`; the shipped values were validated computationally against every surface faint text occupies (dark worst case 4.67:1 on `--pop`, light worst case 4.58:1 on `--panel`). The light value equals `--muted` — the 4.5 floor leaves no room below muted on the light panel, so the two rungs coincide there by necessity. Document-view text moved off `--ghost` to `--faint`: `.act-time`, `.conn-type`, `.pkg-tokens`, `.pkg-note`, `.rd-dash` (ordinals are content), and the unchecked-criterion `○` glyph; `--ghost` keeps decorative glyphs only (chevrons, separators). Linked cards: the row is now a div, the id a real `idChip` (navigates; ⌘-click backgrounds — verified by harness: chip click opened REQ-020), the title a real button carrying `aria-expanded` and the full-height hit target (a button can't nest a button); title-click expansion verified. Mode toggle de-twinned: borderless text segments, active = ember + 2px underline (shape channel per REQ-020), 7px vertical padding → ≥25px hit target. Status undo: `flashUndo` state + 6s toast with an Undo button (`role=status`, aria-live announce); undo reverts through the same setStatus path — verified live: done→in-progress then Undo restored `status: done` on disk byte-for-byte. Verified by screenshot harness in both themes (header, linked cards, activity, toast). 481 tests pass, typecheck and veri check clean.
