---
id: WO-102
type: work-order
title: "MCP filing collapses onto core's createDocument — one creation implementation behind the file_* tools"
status: ready
approved: 2026-08-25
created: 2026-08-25
updated: 2026-08-25
links:
  - id: REQ-009
    rel: implements
  - id: REQ-008
    rel: constrained-by
  - id: DEC-037
    rel: constrained-by
  - id: WO-088
    rel: relates-to
---

## Summary

The four MCP filing tools (file_decision, file_work_order, file_requirement, file_source) each re-implement document creation — id allocation, frontmatter assembly, a verbatim copy of core's slugifyTitle, directory creation, wx-write, id recording — beside core's createDocument, which does the same job for `veri new` and the app's creation flow. The copies have already drifted: WO-088 taught createDocument to emit the commented `binds:` block on new work orders, so CLI/app-created work orders carry the binding affordance but MCP-filed ones (the ones agents actually file) do not. This work order deepens createDocument with a creation-options seam (body override, validated links, date) and reduces each filer to a thin composer: wire params in, markdown sections composed, one createDocument call. Same drift class as WO-093 and WO-097 — the mirror dies, the canon has one home.

## In scope

- Core: `createDocument(veriDir, type, title, options?)` where options is `{date?, body?, links?}` — `body` overrides the template body, `links` are validated against the loaded project (already loaded for id allocation; unknown target throws before anything is written) and rendered into frontmatter, `date` replaces the old positional fourth parameter
- Core: the type subdirectory is created if missing (mkdirSync recursive moves in from the filers, removing the scaffold assumption)
- Core create.test.ts and other core callers of the positional date parameter move to the options form; new coverage for links (valid links render into frontmatter, unknown target throws, no-links behavior unchanged)
- MCP writeback.ts: fileDecision, fileWorkOrder, fileRequirement, fileSource each become a section composer plus one createDocument call; the local slugify copy, per-filer id allocation, and hand-assembled frontmatter are deleted; wire schemas and tool result text unchanged
- A regression test pinning the fixed divergence: an MCP-filed work order carries the commented `binds:` block, same as `veri new`
- All existing writeback.test.ts expectations stay green (content-shape regexes, id consumption, born-unapproved statuses, link rejection)

## Out of scope

- fileReceipt — it appends to an existing document rather than creating one; its section-append mechanics are candidate 4 territory (shared with ui write.ts appendNote/appendReviewNote)
- The [[WO-100]] amend tool itself — this work order only prepares the deeper seam it should land on; coordinate so this lands before [[WO-100]] starts, since both touch writeback.ts
- Any change to the MCP tools' wire schemas, tool descriptions, or result messages
- Moving per-type section composition (## Choice, ## Summary, ## Receipts placeholder) into core — that stays a wire-shape concern of the filing surface

## Requirements

- [[REQ-009]] — implements
- [[REQ-008]] — constrained-by
- [[DEC-037]] — constrained-by
- [[WO-088]] — relates-to

## Acceptance tests

- [ ] grep finds exactly one slugify implementation, one frontmatter assembler, and one id-allocation call path for document creation across packages/ (writeback.ts's copies gone)
- [ ] An MCP-filed work order carries the commented `binds:` block identical to a `veri new` work order — the WO-088 divergence is regression-tested
- [ ] createDocument with links: valid links render into frontmatter and the file passes checkProject; an unknown link target throws before any file is written or id consumed
- [ ] All existing writeback.test.ts tests pass unchanged (born-unapproved statuses, id consumption via veri/ids, link rejection messages still match)
- [ ] Full suite and typecheck green across workspaces; veri check green

## Receipts

(none yet)
