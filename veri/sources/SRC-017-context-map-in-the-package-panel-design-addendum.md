---
id: SRC-017
type: source
title: Context map in the package panel — design addendum
status: imported
created: 2026-08-18
updated: 2026-08-18
links:
  - id: SRC-003
    rel: extends
  - id: DEC-035
    rel: informed-by
---

Design addendum to the agent-handoff panel ([[SRC-003]]) for layered
context packages ([[DEC-035]]): when assembly runs in layered mode, the
package panel must show that some neighborhood documents are enumerated
in the context map rather than inlined — the panel's contract is "exactly
what is served," and serving changed. Written by an agent session
(Claude Code) for [[WO-041]]; pending Daniel's review before any
renderer code changes.

## What changes on screen

Work-order detail → right panel → the package card. Inline-mode packages
render exactly as today — small projects see nothing new.

In layered mode, after the existing per-document rows:

1. **A map divider** in the established micro-label style: `CONTEXT MAP`.
2. **One aggregate row**, same grid as document rows:
   - swatch: **hollow** (1px ring in the neutral text color, no fill) —
     the advisory-surfacing rule ([[SRC-010]]) generalized: filled means
     "body present," hollow means "named, not carried."
   - label: `NN adjacent docs — enumerated, not inlined`
   - right-aligned token figure: the map section's own size (the rows,
     not the bodies they point to).
3. **No per-map-entry rows.** Sixty-six rows would drown the card; the
   full annotated map is one click away via "copy full package," which
   already carries it verbatim. The aggregate row is a fact, not a
   navigation surface.

The card's total-token figure keeps meaning "tokens served" and needs no
change; it already includes the map text.

## Behavior

- No new interactions: the aggregate row is inert in this iteration
  (same as document rows today).
- The row derives from the served package text, never from a second
  assembly — the existing `packageSummary` parser learns the map heading
  (`## Context map — NN adjacent documents, not inlined`) and map row
  lines, keeping the no-drift guarantee that the panel shows what the
  agent receives.
- Empty state unchanged: `assembling…` until the package arrives.

## Out of design

- Expanding the map in the panel, per-entry navigation, or map search —
  future work if the aggregate proves insufficient.
- Any change to the PACKAGE RULES footer text (stale wording is
  [[REQ-019]] / WO-042 territory).
