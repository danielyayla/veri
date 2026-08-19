---
id: SRC-030
type: source
title: Design — Widen the id space
status: imported
created: 2026-08-19
updated: 2026-08-19
links:
  - id: REQ-001
    rel: designs
  - id: REQ-015
    rel: constrained-by
  - id: SRC-016
    rel: derived-from
  - id: DEC-037
    rel: constrained-by
  - id: DEC-012
    rel: constrained-by
---

> Drafted 2026-08-19 by an agent session (Claude Code) for the id
> space work order, per the DEC-012 design gate (the change touches
> renderer regexes), under Daniel's P2 implementation directive.
> Pending Daniel's review. Written spec only; the inventory below is
> from a full-corpus code audit of the current tree.

[[SRC-016]], scale: "the id space — `\d{3}` caps every type at 999,
so the brief's 1,000 sources cannot exist." Today `WO-1000` is not a
degraded experience but a vanishing document: `ID_RE` fails, parse
returns no document, and the file disappears from the corpus.

## The rule: at least three digits, no ceiling

Ids are `PREFIX-` plus a number, **zero-padded to three digits below
1000, unpadded above** — `WO-007`, `WO-999`, `WO-1000`. Every
existing id is already canonical; no file changes, no migration, and
therefore no format bump ([[REQ-015]]): widening acceptance lands in
every reader before any writer can mint a fourth digit, in one
commit. (A project that someday *contains* `WO-1000` is unreadable by
older Veri — noted, acceptable: the mismatch surfaces as the missing-
doc issues old `veri check` already reports, and the format marker
exists if it ever needs to be formalized.)

## The audited change list

**Five regexes** go `\d{3}` → `\d{3,}`: `ID_RE` and `INLINE_REF_RE`
(core `ids.ts`), `INLINE_RE` (renderer `markdown.ts`), `WIKI_RE`
(renderer `editor.ts`), `DOC_ROW_RE` (renderer `derive.ts` — which
also silently omits `WF` from package-panel rows today; fix that in
passing, it is the same one-line regex).

**Allocation**: the three `padStart(3, '0')` sites (core `create.ts`,
mcp `writeback.ts` ×2) are already correct above 999 — padStart is a
no-op — and stay. In `idstore.ts`: the 999 cap throw is removed, and
`ID_LINE_RE`'s `\d{1,3}` becomes `\d+` — today a `WO 1000` line in
`veri/ids` is *silently skipped and then erased on the next write*,
which would quietly break the [[DEC-037]] never-reuse guarantee at
the exact moment it matters.

**Sorting**: with mixed widths, lexicographic order breaks
(`WO-1000` sorts between `WO-099` and `WO-100`). Every id sort moves
to the numeric-aware compare that `sidebar.ts` already uses
(`localeCompare(…, { numeric: true })`), as one shared `compareIds`
helper exported from core `ids.ts` — one concept, one implementation.
Callers from the audit: CLI `list`, core `context.ts` (package
document order — byte-identical for all-3-digit projects, since
numeric and lexicographic agree at uniform width), mcp `search.ts`
(result order + palette tiebreak), renderer `editor.ts` completion
sort, `derive.ts` (×6), `app.ts`.

**Palette zero-strip collision**: `search.ts` shortens ids with
`replace(/0+(\d)/, '$1')`, so `REQ-1004` and `REQ-014` both normalize
to `req14`. The strip becomes leading-zeros-after-the-prefix only
(`REQ-014` → `req14`, `REQ-1004` → `req1004`), which also fixes the
existing `REQ-100` → `req10` oddity.

**Prose**: the schema error message ("3-digit number"), AGENTS.md,
and the site reference page say "three or more digits".

Already width-agnostic (audited, untouched): `typeOfId`, provenance
commit-subject matching (`WO-\d+`), both `[[` autocomplete triggers,
prefix-split type lookups, exact-match id comparisons everywhere, MCP
tool schemas, templates.

## Acceptance shape

A fixture project containing `WO-0999`–adjacent and `WO-1000`-style
ids must: parse fully, link both directions inline and frontmatter,
render chips in reader and editor, sort numerically in every list,
allocate `1000` after `999` without touching `veri/ids` history, and
score `req1004` ≠ `req14` in the palette.
