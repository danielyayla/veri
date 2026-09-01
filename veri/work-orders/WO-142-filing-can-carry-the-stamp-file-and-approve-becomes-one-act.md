---
id: WO-142
type: work-order
title: "Filing can carry the stamp — file-and-approve becomes one act"
status: backlog
created: 2026-09-01
updated: 2026-09-01
links:
  - id: REQ-008
    rel: extends
  - id: DEC-111
    rel: consistent-with
  - id: SRC-066
    rel: derived-from
# binds:         # code this work order claims (optional)
#   paths: []    # repo-root-relative globs
#   tests: []    # test files proving it (path or path::name)
---

## Summary

SRC-066 measured the current choreography: 57 of 194 stamps landed in the very commit that created the document, and the median filing-to-stamp gap is 18 minutes — the judgment happens in the authoring conversation, and the separate approve gesture is bookkeeping for a review that already occurred. When the user is the author, let the filing carry the stamp: one command, one commit. REQ-008 is untouched in substance — the stamp remains the user's act on the user's surfaces; no MCP path gains promotion.

## In scope

- veri new and veri import accept --approve (with --as where maintainers require it), creating the document already promoted and stamped in one write
- The combined path runs the same approval gates approve.ts runs today (issues block, maintainers validated, work orders need a live requirement trace)
- Docs: when to use file-and-approve vs. file-then-review
- A lifecycle-commit subject hint for the combined act so drift anchoring still works

## Out of scope

- Any MCP or agent path to approval (file_* tools still mint pending-only; REQ-008 inviolate)
- The desktop app's create flow (packages/ui is design-gated; follow-up work order after a design pass)
- Changing what approval means or which statuses exist (WO-143 owns the dispatch question)

## Requirements

- [[REQ-008]] — extends
- [[DEC-111]] — consistent-with
- [[SRC-066]] — derived-from

## Acceptance tests

- [ ] veri new requirement "x" --approve creates an accepted, stamped document in one command, and veri check passes on the result
- [ ] The combined path refuses exactly what veri approve refuses today (issue on file, unlisted approver, work order without a requirement trace)
- [ ] MCP e2e still asserts no tool can promote or stamp anything
- [ ] Docs describe both gestures and when each fits
- [ ] Full suite green

## Receipts

(none yet)
