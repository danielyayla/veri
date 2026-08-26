---
id: WO-110
type: work-order
title: "Discard a document from the app — withdraw and delete on the document surface"
status: backlog
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
# binds:         # code this work order claims (optional)
#   paths: []    # repo-root-relative globs
#   tests: []    # test files proving it (path or path::name)
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

- [ ] A design source document exists, is linked `designed-by`, and carries the user's `approved:` stamp before implementation starts
- [ ] A document created with ⌘N can be discarded entirely from within the app, with no terminal step
- [ ] Withdraw shows a confirm naming the document and stating the file and inbound links are kept; cancelling changes nothing on disk
- [ ] Delete is offered for an unapproved, unreferenced document and removes the file; the tab closes
- [ ] For an approved or referenced document, the app states why delete is unavailable and names the referrer
- [ ] A withdrawn document renders with the terminal treatment, leaves the approval queue, and no longer appears among active documents in the sidebar
- [ ] Inbound `[[ID]]` links to a withdrawn document still resolve and open it from the app
- [ ] `veri check` reports zero violations after a withdraw and after a delete performed from the app

## Receipts

(none yet)
