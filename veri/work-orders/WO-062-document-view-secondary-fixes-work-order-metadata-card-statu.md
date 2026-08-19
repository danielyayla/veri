---
id: WO-062
type: work-order
title: "Document-view secondary fixes — work-order metadata card, status-rendering unification, Pin chip, activity feed, note composer"
status: in-progress
created: 2026-08-19
updated: 2026-08-19
links:
  - id: SRC-033
    rel: designed-by
  - id: REQ-004
    rel: extends
  - id: REQ-020
    rel: constrained-by
  - id: DEC-012
    rel: constrained-by
  - id: WO-061
    rel: follows-from
---

## Summary

Ships the secondary findings recorded in SRC-033 (out of WO-061's scope). The largest: work orders have no frontmatter card — reader docs show id/type/status/created/updated plus the WO-056 links editor, while a WO gets one faint metadata line and no way to manage links in the UI at all. Status also renders three different ways across the document view (tinted chip in the frontmatter card, segmented radiogroup on WOs, bare 10px colored text in linked cards). Smaller items from the same critique: the Pin chip floats misaligned against multi-line titles and its ☆ Pin ↔ ★ Pinned label swap shifts layout width; `branch main` is the only ember item in the WO metadata line, giving the least actionable fact the most salient color; the activity section renders a full labeled block for a single "Last edited" row and ephemeral session rows are indistinguishable from durable file activity; and the note composer's Enter-to-commit has no visible affordance once the placeholder is gone.

## In scope

- Give work orders the frontmatter card (id, type, created, updated, and the WO-056 links row/editor); status stays in the header radiogroup only — no duplicate status row. This ends the gap where links cannot be managed on a WO in the UI.
- Unify status rendering: linked-card status text adopts the tinted-chip treatment (`statusChip`), matching the frontmatter card; bare colored status text disappears from the document view.
- De-emphasize `branch` in the WO metadata line — move it off ember to a neutral token so created/updated and branch carry equal weight.
- Pin chip: align to the title's first line on multi-line titles and fix its width so toggling Pin ↔ Pinned causes no layout shift.
- Activity feed: when only file activity exists, collapse to a single quiet line instead of a full labeled section; give session-only rows (ephemeral, lost on restart) a visible distinction from file-derived rows.
- Note composer: show a commit affordance (e.g. a faint ↩ glyph at the row's right edge) whenever the input holds text.

## Out of scope

- Everything WO-061 already shipped (contrast tokens, linked-card ID chips, mode-toggle de-twin, status undo toast).
- Persisting session activity across restarts — only its presentation changes here.
- Redesigning the reader view's frontmatter card itself; it is reused, not reworked.
- Any change to the link, status, or note write paths — presentation only.
- The app-wide `--ghost` small-text sweep outside the document view (palette hints, tab counts, sidebar) — a separate cleanup if wanted.

## Requirements

- [[SRC-033]] — designed-by
- [[REQ-004]] — extends
- [[REQ-020]] — constrained-by
- [[DEC-012]] — constrained-by
- [[WO-061]] — follows-from

## Acceptance tests

- [ ] A work order shows id, type, created, and updated in a frontmatter card, plus the links row; links can be added and removed on a WO in the UI and the written file passes `veri check`.
- [ ] Status appears exactly once in the WO header (the radiogroup); every status in linked cards renders as a tinted chip identical to the frontmatter-card treatment.
- [ ] `branch` is no longer the most salient item in the WO metadata line.
- [ ] Toggling Pin ↔ Pinned causes no layout shift, and the chip aligns with the title's first line on a two-line title.
- [ ] A document whose only activity is "Last edited" renders it as one quiet line, not a full labeled section; session rows are visually distinct from file-activity rows.
- [ ] The note composer shows a commit affordance whenever it holds text, and Enter still commits.
- [ ] `veri check` and `npm test` are clean.

## Receipts

(none yet)
