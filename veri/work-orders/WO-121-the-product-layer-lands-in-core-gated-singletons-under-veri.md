---
id: WO-121
type: work-order
title: "The product layer lands in core: gated singletons under veri/product/, seeded as drafts"
status: backlog
created: 2026-08-27
updated: 2026-08-27
links:
  - id: REQ-037
    rel: implements
  - id: SRC-056
    rel: derived-from
# binds:         # code this work order claims (optional)
#   paths: []    # repo-root-relative globs
#   tests: []    # test files proving it (path or path::name)
---

## Summary

Core learns the product-layer document type: `veri/product/` singletons (vision, users, principles, current-focus) parse and validate with full lifecycle machinery on the WF-001 precedent; `veri check` refuses freeform files there and flags stale current-focus; the four singletons are seeded as drafts for the user's edit and approval.

## In scope

- Core (packages/core): parse and validate `veri/product/` documents — id, status, `approved:` stamp, links — as a typed singleton class outside the four core types (WF-001 precedent); the id scheme and type name are a DEC filed during implementation
- `veri check`: a frontmatter-less or lifecycle-less file under `veri/product/` is a violation; an unknown (non-singleton-set) file there is a violation
- `veri check`: staleness advisory for `current-focus.md` — untouched beyond a threshold or referencing only `done` work orders (threshold choice is a DEC)
- Seed `vision.md`, `users.md`, `principles.md` (drafted from DEC-111/SRC-050 content) and `current-focus.md` as draft-status documents pending the user's approval
- CLI: the new type resolves in `veri approve`, listing, and search
- Tests over parse, check, and staleness paths

## Out of scope

- Context-package assembly changes (WO under REQ-039)
- Any derived materialization of bets/outcomes (`current-bets.md` / `outcomes.md` stay nonexistent)
- UI rendering of product documents (design-gated; separate design + WO)
- MCP writeback tools for product documents

## Requirements

- [[REQ-037]] — implements
- [[SRC-056]] — derived-from

## Acceptance tests

- [ ] `veri check` passes with the four seeded singletons present as drafts
- [ ] A freeform `veri/product/notes.md` fails `veri check`
- [ ] A stale `current-focus.md` surfaces the advisory; a fresh one does not
- [ ] `veri approve` promotes a product singleton and stamps `approved:`
- [ ] Zero `veri check` violations repo-wide

## Receipts

(none yet)
