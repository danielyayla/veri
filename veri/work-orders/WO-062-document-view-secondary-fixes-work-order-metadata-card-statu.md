---
id: WO-062
type: work-order
title: "Document-view secondary fixes — work-order metadata card, status-rendering unification, Pin chip, activity feed, note composer"
status: done
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

- [x] A work order shows id, type, created, and updated in a frontmatter card, plus the links row; links can be added and removed on a WO in the UI and the written file passes `veri check`.
- [x] Status appears exactly once in the WO header (the radiogroup); every status in linked cards renders as a tinted chip identical to the frontmatter-card treatment.
- [x] `branch` is no longer the most salient item in the WO metadata line.
- [x] Toggling Pin ↔ Pinned causes no layout shift, and the chip aligns with the title's first line on a two-line title.
- [x] A document whose only activity is "Last edited" renders it as one quiet line, not a full labeled section; session rows are visually distinct from file-activity rows.
- [x] The note composer shows a commit affordance whenever it holds text, and Enter still commits.
- [x] `veri check` and `npm test` are clean.

## Receipts

- 2026-08-19 — 7385391 — packages/ui/renderer/styles.css, packages/ui/src/renderer/app.ts, packages/ui/src/renderer/derive.ts, packages/ui/src/renderer/views/reader.ts, packages/ui/src/renderer/views/workorder.ts, packages/ui/src/renderer/widgets.ts — claude-code session: all six secondary fixes per SRC-033. Frontmatter card: `frontmatterCard` gains an opts.status flag and is shared into the WO view (status false — the header radiogroup stays the only status); the WO-056 links editor rides along, so links are now manageable on WOs. created/updated moved into the card rather than duplicating in the meta line, which keeps gate chips and a de-emphasized `branch` (off ember, inheriting the line's faint token — git state, not frontmatter, so it stays out of the card). Verified live via the harness: links row expands on WO-062; a link added through the two-field row (SRC-032/test-rel) landed in frontmatter with `veri check` clean, and removing it restored the file byte-for-byte (empty git diff). Status unification: linked-card status is the shared tinted `statusChip` — verified accepted/active chips on WO-062's linked cards match the frontmatter treatment. Pin chip: fixed 78px width, content centered; measured 78px in both states in-app (overlay probe), first-line alignment corrected per container (2px in .wo-head, 12px in .doc-head — titles carry different top margins). Activity: `ActivityRow.session` stamped in `sessionLog`; session rows get a hollow dot (shape channel, REQ-020) + mono `session` tag + tooltip; a lone file-derived "Last edited" (or empty feed) collapses to one quiet unlabeled line (`.act-solo`, faint text). Note composer: a faint aria-hidden ↩ appears at the row's right edge whenever text is present (input gets right padding so text never runs under it); the Enter commit path is untouched. Verified in dark and light themes; color literals stayed out of the styles (DEC-055 — tokens only). 481 tests pass, typecheck, `veri check` 0 issues.
