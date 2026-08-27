---
id: WO-119
type: work-order
title: "Layer headers in the sidebar and the Outcomes view"
status: done
claimed_by: claude-wo119
claimed_at: 2026-08-27
approved: 2026-08-27
created: 2026-08-27
updated: 2026-08-27
links:
  - id: REQ-036
    rel: implements
  - id: DEC-111
    rel: constrained-by
  - id: SRC-054
    rel: designed-by
binds:
  paths:
    - packages/ui/src/renderer/app.ts
    - packages/ui/src/renderer/tabs.ts
    - packages/ui/src/renderer/palette.ts
    - packages/ui/src/renderer/derive.ts
    - packages/ui/src/renderer/views/outcomes.ts
    - packages/ui/renderer/styles.css
  tests:
    - packages/ui/src/renderer/derive.test.ts
    - packages/ui/src/renderer/views/outcomes.test.ts
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
- [[SRC-054]] — designed-by

## Acceptance tests

- [x] Sidebar renders the four headers with Sources; Requirements + Decisions; Work Orders + Architecture; Outcomes grouped beneath them; all panel toggles, counts, subgroups, and the Board row behave exactly as before
- [x] The Outcomes row opens a one-instance tab; a second activation focuses the existing tab
- [x] Outcome evidence rows show the verdict (tests/supports/refutes) and open source and hypothesis; untested bets derive from the snapshot's advisories; recent receipts show commit pointers with DONE-style windowing
- [x] Empty state renders the teaching card when no outcome links exist
- [x] The view holds no authoritative state; ui suite + typecheck pass; shot-harness screenshots verify populated and empty states in both themes; terminal veri check zero issues

## Receipts

- 2026-08-27 — 7ef783e — packages/ui/src/renderer/app.ts, packages/ui/src/renderer/tabs.ts, packages/ui/src/renderer/palette.ts, packages/ui/src/renderer/derive.ts, packages/ui/src/renderer/derive.test.ts, packages/ui/src/renderer/views/outcomes.ts, packages/ui/src/renderer/views/outcomes.test.ts, packages/ui/renderer/styles.css — Claude session: sidebar layer headers (WHY/WHAT/HOW/DID IT WORK?) + the one-instance Outcomes view (evidence, untested bets, windowed receipts, teaching empty); DEC-120 proposed; REQ-004 amended and re-stamped (61b676f); ui suite 365 pass + typecheck clean; shot harness verified light/dark populated and empty; veri check 0 issues
