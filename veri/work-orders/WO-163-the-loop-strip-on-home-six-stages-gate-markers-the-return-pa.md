---
id: WO-163
type: work-order
title: "The loop strip on Home — six stages, gate markers, the return path"
status: done
approved: 2026-09-02
claimed_by: fable-wo163
claimed_at: 2026-09-02
created: 2026-09-02
updated: 2026-09-02
links:
  - id: SRC-076
    rel: designed-by
  - id: REQ-004
    rel: serves
  - id: SRC-068
    rel: constrained-by
binds:
  paths:
    - packages/ui/**
verify: npm -w @verikb/ui test
---

## Summary

Home leads with [[SRC-076]] §The Loop: a six-stage strip (Plan → Design → Build → Test → Deploy → Maintain) mapping live document counts onto Veri's artifact types, gate markers between stages (amber when a stamp waits, green when the gate fires on commit), and a return path closing the loop. Presentation over data Home already surfaces ([[SRC-068]]) — no new data model, no new views. Verifiable alone: ships and renders whether or not the Gate Queue view exists.

## In scope

- A stage-mapping derivation module in `packages/ui` (pure function over parsed documents + check state): per-stage counts (Plan = unfiled/new sources and breaches, Design = draft REQs + proposed DECs, Build = claimed WOs, Test = check/drift state, Deploy = receipts awaiting done, Maintain = outcome sources), and per-gate pending-stamp presence
- The strip rendered atop Home per the bundle (`design/loop-redesign/Main.dc.html`): stage cards in type colors, gate-marker dots, the return-path label, the legend — canon tokens only
- The "At your gates" summary card wiring: rows open the pending document (falls back to the document surface when no Gate Queue view is present)
- Frontmatter declares `binds: paths: [packages/ui/**]` (design-gate path, WF-001 rule 7) — applied in the filing's commit
- Tests for the derivation under `packages/ui/src/**/*.test.ts`

## Out of scope

- The Gate Queue view and the Change Trace (separate slices)
- Any icon rail; any change to Home's existing panels beyond inserting the strip and gate summary
- New document types, statuses, or check rules — the strip reads what exists
- Animating the loop or live-polling beyond Home's existing refresh

## Acceptance tests

- [x] A fixture project renders all six stages with counts derived correctly from document statuses (proves SRC-076 §The Loop stage mapping)
- [x] A gate marker is amber if and only if a promotion is pending at that gate, green otherwise (proves SRC-076 §The Loop gate markers)
- [x] A stage with nothing in flight renders with a zero-state count, not an empty card (proves SRC-076 fixture-independence; degenerate render)
- [x] The strip renders against live files and updates when `veri/` changes externally, without restart (proves REQ-004 "external edits … reflected without restart")
- [x] The derivation module is covered by `node --test` cases (scaffolding, declared: pins the stage mapping)

## Receipts

- 2026-09-02 — 9972917 — packages/ui/src/renderer/loopstrip.ts, packages/ui/src/renderer/loopstrip.test.ts, packages/ui/src/renderer/views/home.ts, packages/ui/renderer/styles.css, veri/decisions/DEC-152-four-wf-001-gates-on-the-loop-strip-s-five-crossings.md — Claude session shipped the Home loop strip — pure loopstrip derivation over the snapshot with gate markers reading gateQueue, six stage cards with the ember claimed-work tint, return path and legend, gate names on AWAITING JUDGMENT rows; npm -w @verikb/ui test exits 0 (355 pass), veri check 0 issues, live-update and both fixture/real-repo renders verified by screenshot.
