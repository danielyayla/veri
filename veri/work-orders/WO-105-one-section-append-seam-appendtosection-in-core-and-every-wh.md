---
id: WO-105
type: work-order
title: "One section-append seam — appendToSection in core, and every whole-file updated: bump adopts bumpUpdated"
status: in-progress
claimed_by: claude-wo-105-session
claimed_at: 2026-08-25
approved: 2026-08-25
created: 2026-08-25
updated: 2026-08-25
links:
  - id: REQ-008
    rel: constrained-by
  - id: DEC-003
    rel: constrained-by
  - id: SRC-006
    rel: designed-by
  - id: WO-102
    rel: relates-to
---

## Summary

Three byte-identical copies of the section-splice algorithm live across two surfaces: appendReceipt (packages/mcp/src/writeback.ts), appendNote and appendReviewNote (packages/ui/src/lib/write.ts) — each finds a ## heading, locates the next section boundary, and rebuilds the section to append one dated line. Beside them, four call sites bump `updated:` with a whole-file regex replace, while core's save.ts already owns the correctly-scoped implementation (bumpUpdated, frontmatter-block-only). This work order deepens core with one pure appendToSection function that all three writers call, and adopts core's existing bumpUpdated at the whole-file bump sites. Unlike WO-093/WO-097/WO-102 this fixes no live bug — it is preventive: the copies have not drifted yet, and the [[WO-100]] amend tool is about to need exactly this seam. Landing it first means amend builds on one splice implementation instead of adding a fourth copy.

## In scope

- Core: a new pure module (sections.ts) exporting `appendToSection(content, heading, line, options?)` — heading matched as `^## {heading}[ \t]*$` (escaped), section created at end-of-document when missing, existing entries preserved and the line appended, an optional `placeholder` (e.g. "(none yet)") stripped before appending; main-entry export, byte-compatible with the three current writers
- Core: a sections.test.ts covering create-when-missing, append-preserving-following-sections, placeholder strip, and multi-word headings
- MCP writeback.ts: fileReceipt's local appendReceipt is deleted; the splice becomes appendToSection(raw, 'Receipts', line, { placeholder: '(none yet)' }) and the updated: bump becomes core's bumpUpdated
- UI write.ts: appendNote and appendReviewNote delete their inline splices in favor of appendToSection('Notes' / 'Review notes'); their updated: bumps and setStatus's bump adopt core's bumpUpdated
- All existing write.test.ts and writeback.test.ts expectations stay green unchanged — the refactor is behavior-preserving for every loadable document

## Out of scope

- The [[WO-100]] amend tool itself — this only prepares the seam it should land on
- approve.ts and start.ts frontmatter edits — already block-scoped, multi-line, differently shaped; no gain from forcing them through bumpUpdated
- The read-side section scanners (core check.ts receipt reader, renderer derive.ts) — reading is a different concern from splicing, and the renderer takes no new imports (no subpath export needed)
- Any change to entry-line formats (receipt dashes, note dates, review markers) — line composition stays with each caller
- Any visual change — notes and review notes surface through the existing SRC-006 design

## Requirements

- [[REQ-008]] — constrained-by
- [[DEC-003]] — constrained-by
- [[SRC-006]] — designed-by
- [[WO-102]] — relates-to

## Acceptance tests

- [ ] grep finds exactly one section-splice implementation across packages/ (the writeback.ts and write.ts copies gone) and zero whole-file `updated:` regex replaces outside core
- [ ] sections.test.ts: create-when-missing, append preserving following sections, placeholder strip, multi-word heading — all green
- [ ] All existing writeback.test.ts and write.test.ts tests pass with zero expectation edits (receipt placeholder replacement, note ordering, review-note gating, setStatus byte-equality)
- [ ] Full suite and typecheck green across workspaces; veri check green

## Receipts

(none yet)
