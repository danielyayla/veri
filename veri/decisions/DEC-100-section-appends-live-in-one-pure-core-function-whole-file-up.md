---
id: DEC-100
type: decision
title: "Section appends live in one pure core function; whole-file updated: bumps adopt save.ts's bumpUpdated"
status: active
approved: 2026-08-25
created: 2026-08-25
updated: 2026-08-25
links:
  - id: WO-105
    rel: constrains
  - id: DEC-003
    rel: relates-to
---

## Choice

Core gains a pure sections module with one function, `appendToSection(content, heading, line, options?)`: match `^## {heading}` exactly (trailing spaces tolerated), create the section at end-of-document when the heading is missing, otherwise splice the line onto the section's existing entries, stripping an optional placeholder line (e.g. "(none yet)") first. The three writers — mcp's appendReceipt, ui's appendNote and appendReviewNote — delete their inline copies and call it; entry-line composition (receipt dashes, note dates, review markers) stays with each caller, because the seam is the splice, not the format. The `updated:` stamp at every whole-file regex-replace site (mcp fileReceipt, ui setStatus/appendNote/appendReviewNote) becomes a call to core's existing bumpUpdated from save.ts, which scopes the replacement to the frontmatter block. The module exports from core's main entry only — no renderer consumer exists, so no DEC-046 subpath is claimed until one does.

## Rejected alternatives

- **A new bump function beside save.ts's** — rejected: core already owns the correctly-scoped implementation (bumpUpdated, frontmatter-block-only, returns text unchanged when no block exists). The deepening here is adoption, not invention; a second bump would be the exact mirror problem this series removes.
- **Forcing approve.ts and start.ts through bumpUpdated too** — rejected: those sites perform multi-line frontmatter edits (status, approved, approved_by) already scoped to the extracted block; rewriting them to thread one line through bumpUpdated restructures working code for no drift-risk reduction.
- **Per-section wrapper functions in core (appendReceiptLine, appendNoteLine…)** — rejected: the heading name and line format are the caller's vocabulary; core owning them would couple core to every surface's entry formats and grow its interface with each new section kind. One general function is the deep module.
- **Moving the whole of fileReceipt/appendNote/appendReviewNote into core** — rejected: their document lookup, gating (isPending, work-order-or-manifest), and IO are surface concerns already thin; only the splice is duplicated canon.
- **A subpath export (./sections) for the renderer** — rejected for now: the renderer only reads sections (derive.ts), never writes them; claiming a subpath without a browser consumer is speculative. The DEC-046/DEC-092 mechanism remains available the day one exists.

## Rationale

Fourth in the deepening series (DEC-091, DEC-092, DEC-098), but preventive rather than corrective: the three splice copies are still byte-identical, so this is the cheapest possible moment to collapse them — before WO-100's amend tool adds a fourth copy and before any drift produces the next WO-097-class bug. The whole-file updated: replaces are a latent hazard (safe only while frontmatter always carries the key, which loadProject currently guarantees) and a semantics fork from save.ts's canonical scoped bump; adopting one implementation makes the stamp's meaning single-homed. Sequencing matters again: WO-100 is ready for dispatch and its amend tool will rewrite sections — landing this first hands it the seam.
