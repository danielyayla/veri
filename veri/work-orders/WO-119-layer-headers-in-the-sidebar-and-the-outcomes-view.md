---
id: WO-119
type: work-order
title: "Layer headers in the sidebar and the Outcomes view"
status: backlog
created: 2026-08-27
updated: 2026-08-27
links:
  - id: REQ-036
    rel: implements
  - id: DEC-111
    rel: constrained-by
  - id: SRC-054
    rel: derived-from
# binds:         # code this work order claims (optional)
#   paths: []    # repo-root-relative globs
#   tests: []    # test files proving it (path or path::name)
---

## Summary

Implements REQ-036 per SRC-054's design (Daniel's chosen full variant). The sidebar gains WHY / WHAT / HOW / DID IT WORK? group headers over the existing collections — non-interactive labels in the RECENT-header register, no behavior change to any panel — and an always-rendered ◎ Outcomes view row under DID IT WORK? opening a one-instance Outcomes tab (Architecture-row pattern, DEC-108). The view derives three sections from existing documents and the check snapshot: outcome evidence (sources with tests/supports/refutes links, verdict chips, hypothesis links), untested bets (the untested-bet advisories), and recent receipts (done WOs with receipt pointers, windowed behind an expander). Stateless; teaching empty state; REQ-004's sidebar paragraph amended to record the shape and REQ-004 re-stamped in a lifecycle-subject commit at Daniel's standing instruction.

## In scope

- Sidebar layer headers (WHY / WHAT / HOW / DID IT WORK?) grouping the existing rows, styled like the RECENT header
- The ◎ Outcomes view row and one-instance Outcomes tab in packages/ui: outcome evidence, untested bets, recent receipts; teaching empty state
- Pure renderer derivations over the snapshot (reusing @verikb/core/pending helpers and the check's advisories)
- Tests for the derivations and rendering; shot-harness verification (light + dark, populated + empty)
- Amend REQ-004's shape paragraph for the grouped sidebar + Outcomes row, re-stamped with a lifecycle-convention commit subject

## Out of scope

- Collapsible or stateful layer groups; layer assignment in document frontmatter
- Moving Board out of the Work Orders panel; any change to collection panels' behavior or counts
- New document types, statuses, sidecar reads, or authoritative state
- Changes to Home's cards (SRC-053 stands)
- Core changes beyond exposing what exists

## Requirements

- [[REQ-036]] — implements
- [[DEC-111]] — constrained-by
- [[SRC-054]] — derived-from

## Acceptance tests

- [ ] Sidebar renders the four headers with Sources; Requirements + Decisions; Work Orders + Architecture; Outcomes grouped beneath them; all panel toggles, counts, subgroups, and the Board row behave exactly as before
- [ ] The Outcomes row opens a one-instance tab; a second activation focuses the existing tab
- [ ] Outcome evidence rows show the verdict (tests/supports/refutes) and open source and hypothesis; untested bets derive from the snapshot's advisories; recent receipts show commit pointers with DONE-style windowing
- [ ] Empty state renders the teaching card when no outcome links exist
- [ ] The view holds no authoritative state; ui suite + typecheck pass; shot-harness screenshots verify populated and empty states in both themes; terminal veri check zero issues

## Receipts

(none yet)
