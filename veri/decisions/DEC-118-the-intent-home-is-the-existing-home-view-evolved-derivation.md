---
id: DEC-118
type: decision
title: "The intent home is the existing Home view evolved; derivations are renderer-pure over the snapshot, and the untested flag is the advisory itself"
status: active
approved: 2026-08-27
created: 2026-08-26
updated: 2026-08-27
links:
  - id: WO-117
    rel: decided-during
  - id: SRC-053
    rel: implements
  - id: DEC-112
    rel: builds-on
  - id: DEC-113
    rel: builds-on
---

## Choice

Implementing REQ-035 (WO-117), the intent home lands as three moves on
the existing Home view rather than a new surface:

1. **No new View key, no new navigation row.** The `homeview` view —
   already the default tab, the sidebar's first row, and the topbar
   health chip's target — gains CURRENT BETS (full-width, under the
   judgment queue) and RECENTLY LEARNED (a grid card), and its NEEDS
   REVIEW card becomes AWAITING JUDGMENT (`N gate crossings`) over the
   unchanged `pendingDocs` derivation, import grouping and all.
2. **Derivations are pure renderer functions over the snapshot**
   (`currentBets`, `recentlyLearned` in derive.ts), reading core's
   dependency-free pending subpath — `requirementKind`, `outcomeLabel`,
   `isOutcomeRel`, `isWithdrawn` — so kind defaults, outcome rendering,
   and the outcome vocabulary can never drift from the CLI or context
   assembly (the DEC-112/DEC-113 placement). No new sidecar channel:
   the snapshot already carries documents and advisories.
3. **The untested-bet flag is the snapshot's `untested-bet` advisory,
   never a renderer recomputation.** The bet row's linked-WO count uses
   the same either-direction, withdrawn-excluded linkage the check
   reads, but the epistemic verdict itself has one evaluation site —
   core's `checkUntestedBets` — so the home can never disagree with
   `veri check`.
4. **An outcome source in RECENTLY LEARNED is a split row** — a main
   button opening the source and a verdict-chip button
   (`supports/refutes/tests REQ-0xx`) opening the hypothesis — because
   the row genuinely has two targets and buttons cannot nest.

## Rejected alternatives

- **A separate Intent view beside Home** — two homes, neither primary;
  REQ-035 names the primary surface, and duplicating the health/flight
  cards or splitting them across two views both lose.
- **Computing the view model in the sidecar (a new channel)** — the
  inputs (documents, advisories) are already in every snapshot; a
  channel would add protocol surface to move a pure function across a
  process boundary.
- **Recomputing the untested-bet rule in the renderer** — a second
  evaluation site that can lag or drift from `veri check`; the advisory
  is already computed by core per snapshot (the DEC-116 posture: one
  guard, one implementation).
- **Replacing RECENTLY CHANGED with RECENTLY LEARNED** — different
  questions (edits vs. evidence), and WO-117 forbids demoting existing
  views.
- **Making the verdict chip a non-interactive span** — REQ-035 requires
  outcome sources to *link* to their hypothesis; a label that names a
  document the row cannot reach fails the app's row grammar.

## Rationale

REQ-035 moves the conceptual center, not the furniture: evolving the
view that is already every entry point's target delivers the intent
surface with zero navigation churn and zero new state. Keeping the
derivations renderer-pure over snapshot data is what makes the
acceptance criterion "deleting it would lose nothing but rendering"
true by construction. Origin: implementing WO-117; design fixed by
SRC-053.
