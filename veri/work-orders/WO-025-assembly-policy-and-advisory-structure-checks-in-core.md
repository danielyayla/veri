---
id: WO-025
type: work-order
title: Assembly policy and advisory structure checks in core
status: backlog
created: 2026-08-13
updated: 2026-08-13
links:
  - id: REQ-006
    rel: implements
  - id: DEC-025
    rel: constrained-by
  - id: DEC-023
    rel: constrained-by
  - id: DEC-006
    rel: constrained-by
  - id: WO-023
    rel: depends-on
---

## Summary

Finish [[REQ-006]] on the foundation [[WO-023]] laid, per [[DEC-025]]:
a schema module in core owning each type's **assembly policy**
(promoted from the hardcoded rules in the MCP package, [[DEC-006]]),
plus **advisory structure checks** that compare a document's `##`
sections against its project's effective template — reported by
`veri check` in a tier that never affects the issue count, the exit
code, or any gate ([[DEC-023]]).

Two REQ-006 criteria are already delivered and are not repeated here:
the CLI's hardcoded templates were deleted into core's template files
(WO-023), and agents retrieve per-type writing guidance through the
context package's Templates section (DEC-024).

## In scope

- **Schema module in core**: one definition per built-in type holding
  its assembly policy — workflow always-included; work orders,
  requirements, and active decisions full-body; superseded decisions
  name-only; sources as excerpts with the 600-char length. The values
  the MCP package hardcodes today, promoted into core as data.
- **`get_context` derives packing from the schema**: the MCP package
  reads the policy instead of embedding it. Output byte-identical for
  the existing document types — covered by an equality test against
  the current assembly.
- **Structure derivation in core**: `expectedSections(veriDir, type)`
  — the `##` headings of the effective template, read fresh
  ([[DEC-002]]) — and `missingSections(doc)` comparing a document's
  headings against them. A template with no `##` headings expects
  nothing (the source template today).
- **Advisory tier in check**: `checkProject` result gains an
  `advisories` list (same file + one-line message shape as issues,
  distinct kind per finding). `veri check` prints advisories after
  issues and reports `ok — N documents, 0 issues · M advisories`;
  exit code and the issue count are driven by issues alone.
- **This repo passes**: existing documents get sections backfilled
  where an advisory would fire and the section genuinely belongs;
  where the template is what's wrong, adjust the template instead.
- Colocated `node --test` coverage: policy-driven packing equality,
  heading extraction and comparison, custom-template projects checked
  against their own structure, advisory separation from issues.

## Out of scope

- Hard enforcement of structure — forbidden by [[DEC-023]] and
  [[DEC-025]].
- Surfacing advisories in the desktop UI (health chip, sidebar dots)
  — UI work needs its own design artifact per [[DEC-012]]; this work
  order must not change what the UI counts as an issue.
- Per-project assembly-policy overrides, user-defined types, and
  schema-generated templates — all rejected or deferred by
  [[DEC-025]] / [[DEC-023]].
- Any change to template files, creation, or the settings view
  ([[WO-023]] / [[WO-024]] territory).

## Requirements

Delivers the remaining criteria of [[REQ-006]] as interpreted by
[[DEC-025]]: schema-owned assembly policy with `get_context` deriving
from it; structure verification against the effective template at
advisory severity; existing documents passing. Constrained by
[[DEC-023]] (generative-only templates, advisory-not-error),
[[DEC-006]] (current package shape stays the behavioral baseline),
and [[DEC-002]] (no caching — structure follows the file on disk).

## Acceptance tests

- [ ] Assembly policy lives as data in core; `get_context` output for
      this repo's work orders is byte-identical before and after
- [ ] A document missing a `##` section its type's template has is
      reported as an advisory with file and one-line message
- [ ] Advisories never change the issue count or `veri check`'s exit
      code; a project with advisories still reports `0 issues`
- [ ] A project with a customized template is checked against its own
      headings — the built-in sections stop applying
- [ ] A template with no `##` headings produces no structure
      advisories for its type
- [ ] `veri check` on this repo: 0 issues, 0 advisories (backfill or
      template adjustments included in this work order)
- [ ] `npm test` passes with the new colocated coverage

## Receipts

(none yet)
