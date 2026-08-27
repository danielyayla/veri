---
id: WO-122
type: work-order
title: "Source kinds and the intuition-only advisory"
status: done
claimed_by: fable-wo122
claimed_at: 2026-08-27
approved: 2026-08-27
created: 2026-08-27
updated: 2026-08-27
links:
  - id: REQ-038
    rel: implements
  - id: SRC-056
    rel: derived-from
# binds:         # code this work order claims (optional)
#   paths: []    # repo-root-relative globs
#   tests: []    # test files proving it (path or path::name)
---

## Summary

Sources gain an epistemic `kind` field (design, user-feedback, metric, external-eval, investigation, outcome) with a migration-free default, and `veri check` surfaces requirements lacking any `derived-from` evidence as intuition-only advisories — the front-side mirror of the untested-bet advisory.

## In scope

- Core: `kind` on source frontmatter with the vocabulary from REQ-038; the absent-field default chosen so all existing sources need no migration (default choice is a DEC)
- `veri check`: intuition-only advisory — a non-withdrawn requirement with no `derived-from` link to any source; clears on evidence or withdrawal/retirement; never a violation
- CLI listing/search and MCP schemas expose source kind; strict schemas updated so `file_source` accepts `kind`
- Context package: source entries state their kind
- Tests over kind parsing, default, advisory raise/clear

## Out of scope

- Backfilling `kind` onto the 56 existing sources (optional follow-up, needs no code)
- UI kind chips or filtering (design-gated; separate design + WO)
- Any auto-promotion of evidence into requirements

## Requirements

- [[REQ-038]] — implements
- [[SRC-056]] — derived-from

## Acceptance tests

- [x] A source with `kind: user-feedback` parses; an unknown kind fails `veri check`
- [x] Existing kind-less sources validate unchanged
- [x] A requirement with no `derived-from` source link raises the intuition-only advisory; linking evidence clears it
- [x] `file_source` via MCP accepts and persists `kind`
- [x] Zero `veri check` violations repo-wide

## Receipts

- 2026-08-27 — e7a9577 — packages/core/src (pending, types, schema, parse, check, context, search, create, self.test + tests), packages/mcp/src (writeback, server + tests), packages/cli (demo corpus rels, test expectations), [[DEC-122]] — source kinds land with the reference default; the intuition-only advisory fires on accepted evidence-less requirements and clears on derived-from or inbound outcome evidence; kind visible in package headings, PaletteHit, and file_source. Full workspace suite green (298 core tests, 790 total). Scoping note recorded in DEC-122: drafts exempt (starters and fresh documents stay quiet); this repo now surfaces 27 intuition-only advisories on its own accepted requirements — backfilling evidence links is the user's judgment, not this WO.
