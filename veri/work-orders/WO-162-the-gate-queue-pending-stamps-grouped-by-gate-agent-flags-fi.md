---
id: WO-162
type: work-order
title: "The Gate Queue — pending stamps grouped by gate, agent flags first"
status: in-progress
approved: 2026-09-02
claimed_by: fable-wo162
claimed_at: 2026-09-02
created: 2026-09-02
updated: 2026-09-02
links:
  - id: SRC-076
    rel: designed-by
  - id: REQ-004
    rel: serves
  - id: REQ-008
    rel: constrained-by
  - id: DEC-111
    rel: constrained-by
binds:
  paths:
    - packages/ui/**
verify: npm -w @verikb/ui test
---

## Summary

The approval pass as a first-class surface, per [[SRC-076]] §Gate Queue: every promotion waiting on the user, grouped into the gates of [[WF-001]]'s loop (intent / decision / dispatch / done), with a detail pane that leads with what the agent flagged and a keyboard-driven approve / edit / send-back bar. Placement reconciled to the shipped navigation: a document-area view opened from Home — the mockups' icon rail is illustrative and [[REQ-004]] ships no rail.

## In scope

- A gate-queue derivation module in `packages/ui` (pure function over parsed documents): draft requirements at the intent gate, proposed decisions at the decision gate, backlog work orders awaiting dispatch at the dispatch gate, in-progress work orders with a filed receipt at the done gate — counts and SRC-076's gate order
- The view: left gate list (sections with counts, j/k selection), detail pane rendering the selected document with agent-flagged concerns first, then alternatives with rejection reasons, then revisit conditions (SRC-076 §Gate Queue anatomy; bundle `design/loop-redesign/Gates.dc.html`)
- Action bar: Approve (`a`) writes the same `approved: YYYY-MM-DD` stamp `veri approve` writes; Edit first (`e`) opens the document in the editor; Send back (`b`) records a review note — all as the user's own act ([[REQ-008]])
- Entry point from Home ("Run the gates") and a keyboard shortcut
- The dispatch-gate rows link to the work-order detail's existing status control rather than performing dispatch
- Frontmatter declares `binds: paths: [packages/ui/**]` (design-gate path, WF-001 rule 7) — applied in the filing's commit
- Tests for the derivation under `packages/ui/src/**/*.test.ts`

## Out of scope

- The loop strip on Home and the Change Trace (separate slices)
- Performing `veri dispatch` from the queue — dispatch stays the user's CLI/status-control gesture ([[DEC-143]])
- Any icon rail or new top-level navigation chrome
- Changes to `packages/core` check or approve semantics — the UI writes what the CLI writes

## Acceptance tests

- [x] With fixture documents in all four pending states, the queue groups them into the four gates with correct counts and SRC-076's gate order (proves SRC-076 §Gate Queue grouping)
- [x] Approving a proposed decision from the queue writes an `approved:` stamp byte-identical to `veri approve`'s and the file passes `veri check` (proves REQ-004 "all UI edits … pass `veri check`")
- [x] The detail pane renders flagged concerns above alternatives and revisit conditions (proves SRC-076 §Gate Queue detail anatomy)
- [ ] The full pass runs without a mouse: j/k to move, a/e/b to act (proves SRC-076 §Gate Queue keyboard path)
- [x] The derivation module is covered by `node --test` cases including an empty queue (scaffolding, declared: guards the degenerate render)

## Receipts

- 2026-09-02 — 015b3f5 — ["packages/ui/src/renderer/gatequeue.ts", "packages/ui/src/renderer/gatequeue.test.ts", "packages/ui/src/renderer/views/gates.ts", "packages/ui/src/renderer/app.ts", "packages/ui/src/renderer/tabs.ts", "packages/ui/src/renderer/views/home.ts", "packages/ui/src/renderer/palette.ts", "packages/ui/renderer/styles.css"] — claude session fable-wo162 shipped the Gate Queue — derivation module + gates view with j/k, flagged-first detail, a/e/b bar; verify `npm -w @verikb/ui test` exit 0 (349 pass); the in-app keyboard pass awaits a live run
