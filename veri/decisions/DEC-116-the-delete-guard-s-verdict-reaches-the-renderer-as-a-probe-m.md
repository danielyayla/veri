---
id: DEC-116
type: decision
title: "The delete guard's verdict reaches the renderer as a probe mode on the delete-doc channel"
status: proposed
created: 2026-08-26
updated: 2026-08-26
links:
  - id: WO-110
    rel: decided-during
  - id: DEC-110
    rel: builds-on
  - id: SRC-052
    rel: implements
---

## Choice

The discard popover must know, before any press, whether core's delete
guard would allow removing the open document — [[SRC-052]] requires a
refused delete to render disabled with the guard's reason, never hidden
and never discovered only on failure. That verdict is served by the one
`delete-doc` sidecar channel in a **probe mode**: `delete-doc(id, true)`
loads the project and returns `{ refusal }` from core's pure
`deleteRefusal` without touching the disk; `delete-doc(id, false)` calls
core's `deleteDocument`, which re-evaluates the same guard before
unlinking. The renderer's bridge splits the two modes into `deleteProbe`
and `deleteDoc` so call sites stay typed and intention-revealing.

The guard is evaluated in the sidecar (Node) both times, by core's own
functions. The renderer never carries a copy of the two conditions.

## Rejected alternatives

- **Bundling `deleteRefusal` into the renderer** — it is pure over
  `VeriDocument[]` and the snapshot has the documents, so this would
  work today. But `discard.ts` lives behind core's Node-only main entry
  (it imports `node:fs`), so browser reach would mean relocating the
  predicate onto a dependency-free subpath — a packages/core change,
  and WO-110 forbids core changes. It would also create a second
  evaluation site whose snapshot can lag the disk.
- **A third sidecar channel (`delete-refusal`)** — the same behavior
  with a wider protocol surface; WO-110's scope names exactly two new
  channels, and the probe is not a different capability, just the same
  guard read without the act.
- **Always showing Delete and reporting the refusal on failure** — the
  simplest wiring, but it makes the confirm dialog a trap: a press that
  was never going to work, explained only after the fact. SRC-052 rules
  this out explicitly.
- **Carrying the verdict in every snapshot** — computes n verdicts per
  refresh to serve the one document whose popover is open, and widens
  the snapshot shape for a rare act. The probe is on-demand and exact.

## Rationale

One guard, one implementation, evaluated where the files are. The probe
races an external edit in principle — the verdict can change between
popover-open and press — but the act re-runs the guard in core, so the
race costs at worst an explanatory toast, never a wrong delete.
