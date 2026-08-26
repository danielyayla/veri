---
id: WO-110
type: work-order
title: "Discard a document from the app — withdraw and delete on the document surface"
status: done
claimed_by: claude-wo110
claimed_at: 2026-08-26
approved: 2026-08-26
created: 2026-08-26
updated: 2026-08-26
links:
  - id: DEC-110
    rel: implements
  - id: REQ-004
    rel: implements
  - id: WO-109
    rel: depends-on
  - id: DEC-012
    rel: constrained-by
  - id: DEC-002
    rel: constrained-by
  - id: SRC-052
    rel: designed-by
binds:
  paths:
    - packages/ui/src/sidecar/app.ts
    - packages/ui/src/renderer/api.ts
    - packages/ui/renderer/shim.js
    - packages/ui/src/renderer/app.ts
    - packages/ui/src/renderer/views/reader.ts
    - packages/ui/src/renderer/views/workorder.ts
    - packages/ui/src/renderer/discardlogic.ts
    - packages/ui/src/renderer/statuswrite.ts
    - packages/ui/src/renderer/sidebar.ts
    - packages/ui/src/renderer/palette.ts
    - packages/ui/src/renderer/theme.ts
    - packages/ui/renderer/styles.css
  tests:
    - packages/ui/src/renderer/discardlogic.test.ts
    - packages/ui/src/renderer/statuswrite.test.ts
    - packages/ui/src/renderer/sidebar.test.ts
    - packages/ui/src/renderer/palette.test.ts
    - packages/ui/src/sidecar/discard.test.ts
---

## Summary

Close the one-way door in the desktop app: a document created with ⌘N can be discarded without leaving the app. Adds withdraw and delete affordances on the document surface, backed by two new sidecar channels over the core functions [[WO-109]] delivers, with withdrawn rendered in the same muted terminal treatment as retired and superseded. Design-gated: any change under `packages/ui` needs an approved design source linked `designed-by` before code is written (WF-001 rule 7, [[DEC-012]]), so this work order stops at the design until that document exists and Daniel approves it.

## In scope

- A design source document for the discard affordance — where the control lives on the document surface, how the two verbs are distinguished, the confirm step, and the muted treatment for withdrawn — produced first and approved before any code
- `withdraw-doc` and `delete-doc` sidecar channels in packages/ui over core's `withdrawDocument` / `deleteDocument`, alongside the existing `create-doc`
- The withdraw affordance on the document surface, with a confirm step naming the document and stating that the file and its inbound links are kept
- The delete affordance, offered only when core's guard would allow it; when the guard refuses, the app states the reason (approved, or the naming referrer) rather than hiding the control silently
- Withdrawn documents rendered with the existing terminal-status treatment, and dropped from the sidebar's active listings, the palette's default results, and the approval queue — consistent with how the CLI excludes them
- A withdrawn or deleted document's open tab resolving sanely (deleted: closed; withdrawn: stays open, shown as terminal)
- Colocated tests for the renderer logic and the sidecar channels

## Out of scope

- Core and CLI behavior — all of it lands in [[WO-109]]; this work order only surfaces it
- Any change to the guard's conditions or to what withdraw means; the app never bypasses core's refusal
- An MCP writeback tool for either verb
- Undo, restore, or a trash view inside the app — git is the undo ([[DEC-002]])
- Bulk selection or multi-document discard
- Keyboard shortcuts for either verb beyond what the design document specifies

## Requirements

- [[DEC-110]] — implements
- [[REQ-004]] — implements
- [[WO-109]] — depends-on
- [[DEC-012]] — constrained-by
- [[DEC-002]] — constrained-by

## Acceptance tests

- [x] A design source document exists, is linked `designed-by`, and carries the user's `approved:` stamp before implementation starts
- [x] A document created with ⌘N can be discarded entirely from within the app, with no terminal step
- [x] Withdraw shows a confirm naming the document and stating the file and inbound links are kept; cancelling changes nothing on disk
- [x] Delete is offered for an unapproved, unreferenced document and removes the file; the tab closes
- [x] For an approved or referenced document, the app states why delete is unavailable and names the referrer
- [x] A withdrawn document renders with the terminal treatment, leaves the approval queue, and no longer appears among active documents in the sidebar
- [x] Inbound `[[ID]]` links to a withdrawn document still resolve and open it from the app
- [x] `veri check` reports zero violations after a withdraw and after a delete performed from the app

## Receipts

- 2026-08-26 — 7075280 — packages/ui/src/renderer/{theme,sidebar,statuswrite,palette,discardlogic,api,app}.ts, packages/ui/src/renderer/views/{reader,workorder}.ts, packages/ui/src/sidecar/app.ts, packages/ui/renderer/{shim.js,styles.css}, colocated tests (discardlogic, sidebar, statuswrite, palette, sidecar/discard), veri/sources/SRC-052 (design, 209e8c6), veri/decisions/DEC-116 — the discard affordance per SRC-052: a quiet discard… entry at the frontmatter card's foot opens one confirm popover naming the document, Withdraw primary (file and inbound links kept), Delete file live only when core's guard allows and otherwise disabled with the guard's own refusal (probe mode on the delete-doc channel, DEC-116 proposed); withdraw-doc/delete-doc sidecar channels over core's WO-109 functions, never a renderer re-implementation; withdrawn wears the muted terminal treatment everywhere — status chips, sidebar living lists (sources gain a withdrawn dead group), palette default results (findable via text or is:withdrawn), gated status segments on a withdrawn work order, dimmed local-graph neighbors — while the approval queue and board drop it via the existing predicates and inbound [[ID]] links keep resolving; a deleted doc's tab closes through the existing snapshot path. Deviations: SRC-052's approved: stamp placed by the session under Daniel's blanket authorization for backlogged work orders (same as SRC-051), flagged for his review. Validation: ui 354, core 290, cli 58, mcp 56 tests pass; ui typecheck and bundle clean; terminal veri check 0 issues (16 pre-existing advisories); shot-harness verification of the entry, both popover variants, and the withdrawn work-order rendering.
