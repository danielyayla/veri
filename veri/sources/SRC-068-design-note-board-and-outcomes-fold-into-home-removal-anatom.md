---
id: SRC-068
type: source
title: "Design note — Board and Outcomes fold into Home: removal anatomy and the absorption spec"
status: imported
kind: design
created: 2026-09-01
updated: 2026-09-01
links:
  - id: WO-152
    rel: designs
  - id: REQ-004
    rel: designs
  - id: REQ-035
    rel: serves
  - id: DEC-145
    rel: constrained-by
  - id: DEC-012
    rel: constrained-by
  - id: SRC-047
    rel: revisits
  - id: SRC-054
    rel: revisits
---

> Drafted 2026-09-01 by an agent session (Claude Code) at Daniel's direction, as the design-gate artifact for [[WO-152]] ([[DEC-012]]). No mockup bundle: the change removes two views and adjusts Home entries that already exist. Revisits [[SRC-047]] (the Board's return — the board's second folding, per [[DEC-145]]) and [[SRC-054]] (the Outcomes view row).

## What leaves, by surface

- **Work Orders panel**: the `tp-board` row atop the panel's list (app.ts ~2888–2902, glyph `▤`) and its active-state styling. The panel's status subgroups with done behind the expander ([[SRC-025]]) are already the list surface and do not change.
- **Sidebar**: the `viewItem('outcomes', 'Outcomes', '◎')` row (app.ts ~2817), and the **DID IT WORK? layer header** — after the row leaves it groups nothing, and headers group, never navigate ([[REQ-036]] as amended). WHY / WHAT / HOW stay.
- **View machinery**: `'board'` and `'outcomes'` leave the `View` union (app.ts:75); `views/board.ts` and `views/outcomes.ts` (+test) are deleted; the `boardDone` and `outcomesDone` session-state fields (app.ts ~211–214, ~463–464) go with their views.
- **Palette**: the ⌘K "Board" and "Outcomes" view entries.
- **Not touched**: `STATUS_COLORS` / status segments — the work-order detail's segmented control still consumes them; only board-specific usage is deleted.

## The absorption spec (Home)

Home ([[REQ-035]], SRC-053/SRC-055) already carries most of what the Outcomes view showed. The delta this change must close:

- **CURRENT BETS** already flags untested bets — unchanged.
- **RECENTLY LEARNED** already distinguishes outcome sources; each outcome-source entry must also carry what the Outcomes view added: the verdict chip (tests / supports / refutes) linking to the hypothesis it answers. If that chip already renders, this is a no-op — verify against a fixture with all three verdicts.
- The Outcomes view's **recent-receipts strip is not absorbed**: receipts are one-line pointers now ([[DEC-142]]) and render on the work-order detail; a Home strip of them would restate git.
- The **teaching empty state** moves conceptually to Home: RECENTLY LEARNED's empty state teaches the loop ("nothing has reported back yet…") — reuse the Outcomes view's empty-state copy if Home's is thinner.

## Behavior at the edges

- **Stale session state**: persisted tabs or last-view naming `'board'` / `'outcomes'` restore to Home silently (same tolerance as SRC-067's removal; guard the restore path if it throws on unknown keys).
- **Lifecycle coverage**: every Board affordance was read-only navigation — cards opening the work-order detail. Nothing relocates; the panel and detail already cover the whole lifecycle ([[DEC-145]]).

## Done looks like

The app builds with board.ts and outcomes.ts removed and no dead sidebar, palette, tab, or route entries; Home shows untested bets and outcome sources with verdict chips (fixture-driven render test); the sidebar shows three layer headers; a session restored from a board or outcomes tab opens on Home.
