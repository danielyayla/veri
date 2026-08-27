---
id: SRC-054
type: source
title: "Design — the sidebar teaches the layer framing: WHY / WHAT / HOW / DID IT WORK, with an Outcomes view row"
status: imported
created: 2026-08-27
updated: 2026-08-27
---

> Designed 2026-08-27 in conversation with Daniel, who chose the full
> variant (headers plus a dedicated view) over the minimal one
> (headers routing to Home). Stamped `approved:` on that instruction.

## The question

The pivot's layer framing (SRC-050: WHY / WHAT / HOW / DID IT WORK?) names four questions the knowledge base answers. Should the sidebar present it — and how, given that a document's *type* is intrinsic but its *layer* is contextual? Sources sit in two layers (WHY-evidence and DID-IT-WORK outcome evidence, distinguished only by their links); decisions split between WHAT (product tradeoffs) and HOW (implementation choices); DID IT WORK has no collection at all — receipts live inside work orders and outcome evidence is a link pattern.

## The design

**Layers are grouping, not containers.** The four collections stay exactly what they are — panels with their existing rows, subgroups, board entry, counts, and toggles. The sidebar gains small-caps layer headers above them, and one new always-rendered view row:

```
⌂ Home
WHY
  ● Sources
WHAT
  ● Requirements
  ● Decisions
HOW
  ● Work Orders          (▤ Board row inside, unchanged per SRC-047)
  ⌗ Architecture         (unchanged per SRC-049)
DID IT WORK?
  ◎ Outcomes             (new view row)
RECENT
  …
```

Headers are non-interactive labels in the same visual register as the existing RECENT header — they group, they do not collapse, filter, or own state. No collection moves, no document moves, no counts change.

**The Outcomes view** follows the Architecture-row pattern (SRC-049, DEC-108): an always-rendered `◎ Outcomes` row under the DID IT WORK? header opens a one-instance Outcomes view tab. The view is derived and stateless — a query over existing documents and the check snapshot, holding no authoritative state:

1. **Outcome evidence** — sources carrying outcome links (`tests` / `supports` / `refutes`), newest first, each with its verdict chip and a link to the hypothesis it answers (the RECENTLY LEARNED verdict-chip treatment from SRC-053, given room to breathe: full rows, not a card corner).
2. **Untested bets** — the check snapshot's `untested-bet` advisories: hypotheses whose work orders are all done with no outcome source, each row linking the requirement and naming what shipped without evidence.
3. **Recent receipts** — done work orders newest-first by receipt date, each with its receipt pointer (commit short-sha) and implemented requirement, windowed behind an expander like DONE on the board.

Empty state: a teaching card mirroring the home's bets card — "Nothing reported back yet — when a shipped hypothesis gets outcome evidence (a source linked tests/supports/refutes), reality's answers land here."

**Duplication is honest, not accidental:** an outcome source appears in Sources (its type) and in Outcomes (its role). That is the resolution of the layer/type ambiguity — the same document seen through two lenses, never two homes.

**Relation to Home:** Home keeps CURRENT BETS and RECENTLY LEARNED as the at-a-glance answer; Outcomes is the full-depth surface for the same question — the relationship Board has to the Work Orders panel's status subgroups (SRC-047 precedent).

## Out of scope

Collapsible layer groups; moving Board out of the Work Orders panel; any new document type or storage; layer assignment in frontmatter.
