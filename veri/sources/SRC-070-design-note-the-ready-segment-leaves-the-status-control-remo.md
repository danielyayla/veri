---
id: SRC-070
type: source
title: "Design note — the ready segment leaves the status control: removal anatomy"
status: imported
kind: design
created: 2026-09-02
updated: 2026-09-02
links:
  - id: WO-143
    rel: designs
  - id: DEC-143
    rel: constrained-by
  - id: DEC-012
    rel: constrained-by
  - id: SRC-051
    rel: revisits
  - id: SRC-052
    rel: revisits
---

> Drafted 2026-09-02 by an agent session (Claude Code) at Daniel's
> direction, as the *retroactive* design-gate artifact for [[WO-143]]
> ([[DEC-012]]): the change already shipped in e0abf33 with no
> designed-by link — the veri:review pass ([[MET-010]]) found the gap,
> and this note records the removal anatomy the gate should have had
> before implementation. No mockup bundle: the change is subtractive,
> and every surviving segment renders exactly as it did.

## What leaves, by surface

- **`views/workorder.ts`**: the `{ status: 'ready', label: 'ready' }`
  entry leaves `STATUS_SEGMENTS`. The radiogroup renders three segments
  — backlog, in progress, done — and the withdrawn terminal state
  remains outside the segment row, as before.
- **`statuswrite.ts` — `segmentRefusal`**: the entire `ready` refusal
  grammar retires with the state ([[DEC-143]]) — the entry gate
  (WO-103, DEC-096: "ready is entered via veri approve") and the exit
  gates in all three directions (WO-111, [[SRC-051]]: leaving ready
  discards the stamp). What remains is a single guard.

## What deliberately stays

- **The withdrawn terminal gate** (WO-110, [[SRC-052]]): no click can
  resurrect a withdrawn work order; git is the undo (DEC-002). The
  refusal grammar's only surviving rule.
- **The radiogroup mechanics**: roving tabindex, ↩/Space activation,
  the write path through `writeStatus` — untouched.
- **Every other status transition**: with `ready` gone the control
  refuses nothing between the three live states; whether backlog →
  in-progress should instead route the user to `veri dispatch` (the
  claim records who holds it; a click would not) is the follow-up
  design pass's business, named as such in e0abf33's message and not
  claimed by this note.

## Behavior at the edges

- A work order file still carrying `status: ready` (an unmigrated
  format-4 project) never reaches this control: the document fails
  parse upstream with the migration named (b6d17fd, REQ-015).

## Done looks like

The status control renders backlog / in progress / done; withdrawn
work orders refuse every click with the terminal-state message; no
code path references a `ready` segment. Shipped and verified in
e0abf33 (statuswrite tests rewritten with the segment's removal).
