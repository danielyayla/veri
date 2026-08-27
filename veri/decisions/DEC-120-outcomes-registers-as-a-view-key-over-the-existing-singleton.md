---
id: DEC-120
type: decision
title: "Outcomes registers as a view key over the existing singleton-tab machinery; layer headers reuse the RECENT register; the receipts window is session state"
status: proposed
created: 2026-08-27
updated: 2026-08-27
links:
  - id: WO-119
    rel: decided-during
  - id: SRC-054
    rel: implements
  - id: DEC-108
    rel: builds-on
  - id: DEC-118
    rel: builds-on
---

## Choice

Implementing WO-119 (SRC-054's full variant), the Outcomes surface lands as composition over existing machinery rather than new state or protocol:

1. **`outcomes` joins `ViewKey`/`VIEW_META`** (glyph `◎`), so the one-instance rule, tab persistence/restore, palette row, and sidebar `viewItem` anatomy all come for free — the DEC-108 Architecture-row pattern verbatim. No `openOutcomes` method: the row calls `setView('outcomes')` like every view row.

2. **Derivations are renderer-pure in derive.ts** beside WO-117's `currentBets`/`recentlyLearned` (the DEC-118 placement): `outcomeEvidence` (non-withdrawn sources with `tests`/`supports`/`refutes` links via core's `isOutcomeRel`, newest first, uncapped — the full-depth surface behind Home's capped window), `untestedBets` (the snapshot's `untested-bet` advisories joined with titles, never a recomputation — the advisory already carries `workOrderIds`, naming what shipped), and `recentReceipts` (done work orders' latest receipt via the existing `receipts()` parser, newest receipt date first, `implements`-linked REQ ids carried).

3. **Sidebar layer headers are `side-label` divs with a spacing modifier** (`side-layer`) — the literal RECENT-header class, so the register can never drift; the headers replace the inter-group dividers. Collection rows reorder to the SRC-054 layout (Sources under WHY first) with `collItem` untouched — grouping, never containers.

4. **The RECENT RECEIPTS expander is session-only state** (`outcomesDone`, the `boardDone` twin) driving a pure `receiptsWindow` helper; nothing is persisted. All three sections render at zero with per-section empties; the teaching card ("Nothing reported back yet…") is the OUTCOME EVIDENCE section's empty state, mirroring the home bets card's teach-at-zero posture.

## Rejected alternatives

- **A dedicated sidecar channel or new snapshot field for outcomes** — the inputs (documents, links, advisories) are already in every snapshot; a channel would move a pure function across a process boundary (the DEC-118 rejection, again).
- **Recomputing the untested-bet rule in the renderer** — a second evaluation site that can lag or drift from `veri check`; the advisory is computed once by core per snapshot.
- **A bespoke sidebar header class** — a parallel style register that could drift from RECENT's; the design names "the RECENT-header register", so the code shares the class.
- **Persisting the receipts-expander state** — the board's DONE expander is session-only precedent; persisting a disclosure flag adds workspace-file surface for no recall value.
- **Capping outcome evidence like Home's RECENTLY LEARNED** — the view is the full-depth surface behind that window (SRC-054's Board:panel relationship); capping it would leave older evidence unreachable.
- **Hiding empty sections** — appearing/disappearing sections undermine spatial memory and the teaching posture (the DEC-108 empty-state argument); all three render at zero.

## Rationale

Every alternative added a second evaluation site or new state for what the snapshot already carries. Registering a ViewKey buys singleton tabs, persistence, and palette reach in one line each; reading the advisory keeps the epistemic verdict at core's one implementation (the DEC-116/DEC-118 posture), so the view can never disagree with `veri check`; reusing the SRC-053 verdict-chip and split-row grammar keeps outcome vocabulary rendering identical between Home and Outcomes. Origin: implementing WO-119; design fixed by SRC-054.
