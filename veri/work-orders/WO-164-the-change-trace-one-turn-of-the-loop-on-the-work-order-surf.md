---
id: WO-164
type: work-order
title: "The Change Trace — one turn of the loop on the work-order surface"
status: done
approved: 2026-09-02
claimed_by: fable-wo164
claimed_at: 2026-09-02
created: 2026-09-02
updated: 2026-09-02
links:
  - id: SRC-076
    rel: designed-by
  - id: REQ-004
    rel: serves
  - id: SRC-024
    rel: constrained-by
binds:
  paths:
    - packages/ui/**
verify: npm -w @verikb/ui test
---

## Summary

The audit trail as a screen, per [[SRC-076]] §Change Trace: from any work order, a linear read of the chain around it — evidence → requirement → decision → work order (commits + receipt) → outcome — with connector labels naming what fired each hop, a stamp ledger, and elapsed times. Placement reconciled to the shipped app: [[REQ-004]] ships no Graph screen, so the trace lives on the document surface, reached from the work-order detail, following the [[SRC-024]] neighborhood-map precedent.

## In scope

- A chain-derivation module in `packages/ui` (pure function over parsed documents): walk from a work order along its links (derived-from / implements / constrained-by / outcome-of and inline [[refs]]) into the causal order evidence → REQ → DEC → WO → outcome, tolerating missing hops
- The spine rendering per the bundle (`design/loop-redesign/Trace.dc.html`): type-colored nodes, artifact cards with stamp author/date, connector labels distinguishing human gates (◈) from commit-fired hops (◇), the stamp ledger and elapsed-times rail
- Elapsed times computed from frontmatter dates (created / approved / claimed_at / receipt date)
- Entry affordance on the work-order detail screen
- Frontmatter declares `binds: paths: [packages/ui/**]` (design-gate path, WF-001 rule 7) — applied in the filing's commit
- Tests for the derivation under `packages/ui/src/**/*.test.ts`

## Out of scope

- The Gate Queue view and the loop strip (separate slices)
- A full-graph or multi-change view — one work order's chain per trace
- Editing documents from within the trace
- Git archaeology beyond what document frontmatter and receipts record — commit hashes render when a receipt carries them, and are absent otherwise

## Acceptance tests

- [x] For a fixture work order with a full chain, the spine renders every hop in causal order with stamp dates read from frontmatter (proves SRC-076 §Change Trace anatomy)
- [x] A chain with missing hops — no decision, no outcome yet — renders open-ended, not as an error (proves SRC-076 "the loop is often mid-turn"; degenerate render)
- [x] Elapsed times match the frontmatter date arithmetic for evidence → accepted, accepted → done, done → verdict (proves SRC-076 §Change Trace indicators)
- [x] The trace opens from the work-order detail screen (proves the SRC-024-style placement this slice reconciles to)
- [x] The derivation module is covered by `node --test` cases (scaffolding, declared: pins the walk order and hop tolerance)

## Receipts

- 2026-09-02 — 0aca0f1 — ["packages/ui/src/renderer/trace.ts", "packages/ui/src/renderer/trace.test.ts", "packages/ui/src/renderer/views/trace.ts", "packages/ui/src/renderer/views/workorder.ts", "packages/ui/renderer/styles.css"] — claude session (fable-wo164) shipped the Change Trace: pure chain derivation + spine render behind a Trace-this-change expander on the work-order detail, stamp ledger and elapsed legs from frontmatter dates, evidence scoped per DEC-153; verify npm -w @verikb/ui test exit 0, 364 pass
