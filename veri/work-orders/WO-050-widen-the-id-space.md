---
id: WO-050
type: work-order
title: "Widen the id space"
status: done
created: 2026-08-19
updated: 2026-08-19
links:
  - id: REQ-001
    rel: implements
  - id: SRC-030
    rel: designed-by
  - id: SRC-016
    rel: derived-from
---

## Summary

Ids gain a fourth digit and beyond: `PREFIX-` plus a number, zero-padded to three digits below 1000 and unpadded above, with no ceiling. Today `WO-1000` is a vanishing document — `ID_RE` rejects it, parse returns nothing, and the file silently drops out of the corpus; the `veri/ids` high-water parser skips (and then erases) any 4-digit line, quietly breaking the [[DEC-037]] never-reuse guarantee. This order executes the audited change list in [[SRC-030]]: five regexes widen, the idstore cap and line pattern open up, every id sort moves to one shared numeric-aware `compareIds` in core, the palette zero-strip collision is fixed, and the prose (schema error, AGENTS.md, site reference) follows. No file migrations and no format bump — every existing id is already canonical.

## In scope

- The five `\d{3}` regexes → `\d{3,}`: core `ids.ts` (`ID_RE`, `INLINE_REF_RE`), renderer `markdown.ts` (`INLINE_RE`), renderer `editor.ts` (`WIKI_RE`), renderer `derive.ts` (`DOC_ROW_RE` — also add the missing `WF` alternative there)
- `idstore.ts`: remove the 999 cap throw; `ID_LINE_RE` `\d{1,3}` → `\d+` so 4-digit high-water lines parse and survive rewrites
- A shared `compareIds` (numeric-aware) exported from core `ids.ts`, used by every id sort from the SRC-030 audit: CLI `list`, core `context.ts` (×3), mcp `search.ts` (×2), renderer `editor.ts`, `derive.ts` (×6), `app.ts`, `sidebar.ts` (replacing its inline numeric localeCompare)
- Fix the palette id zero-strip so only zeros after the prefix are stripped (`REQ-1004` ≠ `REQ-014`)
- Prose updates: schema error message, AGENTS.md id line, site reference page
- Tests covering 4-digit parse, inline refs, chips, sorting, allocation past 999, idstore round-trip, and the palette collision

## Out of scope

- Any file migration or renaming of existing documents (all current ids stay as they are)
- A format-version bump ([[REQ-015]] — widening acceptance is backward-compatible; noted in SRC-030)
- New id prefixes or changes to the prefix vocabulary
- The context-package row *format* (only the parser regex widens)

## Requirements

- [[REQ-001]] — implements
- [[SRC-030]] — designed-by
- [[SRC-016]] — derived-from

## Acceptance tests

- [x] A fixture document with a 4-digit id parses, links (frontmatter and inline, both directions), renders as chips in reader and editor, and appears in search
- [x] `veri/ids` with a 4-digit line parses, is honored as the floor, and survives a `recordIssuedId` rewrite intact
- [x] Allocation proceeds 999 → 1000 without error; `padStart` output passes `ID_RE`
- [x] All id-ordered lists sort `WO-999` before `WO-1000` (numeric, not lexicographic); package assembly order is byte-identical for existing all-3-digit projects
- [x] Palette query `req14` does not match a 4-digit `REQ-1004`
- [x] `veri check` stays at zero issues; full typecheck and test suite pass

## Receipts

- 2026-08-19 — cc0feb2 — packages/core/src/ids.ts, packages/core/src/idstore.ts, packages/core/src/schema.ts, packages/core/src/context.ts, packages/core/package.json, packages/cli/src/commands.ts, packages/mcp/src/search.ts, packages/ui/src/renderer/markdown.ts, packages/ui/src/renderer/editor.ts, packages/ui/src/renderer/derive.ts, packages/ui/src/renderer/app.ts, packages/ui/src/renderer/sidebar.ts, AGENTS.md, site/docs/reference.html, packages/core/src/ids.test.ts, packages/core/src/idstore.test.ts, packages/mcp/src/search.test.ts, packages/ui/src/renderer/markdown.test.ts, packages/ui/src/renderer/derive.test.ts — claude-code session: executed the SRC-030 change list — five regexes widened to \d{3,}, idstore cap removed and high-water lines any-width, shared numeric compareIds in core (renderer reaches it via the @veri/core/ids subpath, DEC-046 proposed), DOC_ROW_RE additionally taught the workflow row's own heading shape (no status segment) since the WF alternative alone never matched, palette zero-strip prefix-anchored, prose updated; typecheck clean, 389 tests green, veri check 0 issues / 9 pre-existing advisories
