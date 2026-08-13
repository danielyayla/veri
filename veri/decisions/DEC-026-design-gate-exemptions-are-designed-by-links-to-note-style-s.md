---
id: DEC-026
type: decision
title: "Design-gate exemptions are designed-by links to note-style source documents"
status: active
approved: 2026-08-13
created: 2026-08-13
updated: 2026-08-13
links:
  - id: DEC-012
    rel: extends
  - id: WO-010
    rel: constrains
---

## Choice

The design-gate check ([[WO-010]]) has exactly one satisfaction
mechanism: a resolvable `rel: designed-by` link. A work order the
body-text heuristic catches without a real design artifact — incidental
mention of `packages/ui`, mechanical type-completion, or the check's
own definition quoting the string — links a **note-style source
document** ([[SRC-011]]) with `rel: designed-by`. The note records,
per work order, why no design exists, so the exemption is readable in
the link graph and rides into context packages like any other
constraint.

## Rejected alternatives

- **A frontmatter exemption flag** (e.g. `design-exempt: true`) — a
  second mechanism for the check to honor and a new schema surface,
  invisible to the link graph; a bare boolean records no reason.
- **Refining the heuristic** (scan only In-scope sections, or exclude
  receipts) — [[WO-010]] fixes body-text mention as the v1 heuristic
  and rules out cleverer detection; a subtler regex trades false
  positives for silent false negatives.
- **Rewording work-order bodies to avoid the literal string** —
  receipts list real file paths and summaries quote real commands;
  editing history to dodge a check falsifies the record.

## Rationale

One mechanism keeps the check to WO-010's spec (presence and
resolvability of a designed-by link, nothing more) while the note
carries the human-readable why. False positives stay loud in exactly
one place — the note — instead of being silenced by config, and
removing an exemption is deleting one link line.
