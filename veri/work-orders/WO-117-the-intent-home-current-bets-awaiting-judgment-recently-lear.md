---
id: WO-117
type: work-order
title: "The intent home: current bets, awaiting judgment, recently learned"
status: done
claimed_by: claude-wo117
claimed_at: 2026-08-26
approved: 2026-08-26
created: 2026-08-26
updated: 2026-08-26
links:
  - id: REQ-035
    rel: implements
  - id: DEC-111
    rel: constrained-by
  - id: SRC-050
    rel: derived-from
  - id: SRC-053
    rel: designed-by
binds:
  paths:
    - packages/ui/src/renderer/derive.ts
    - packages/ui/src/renderer/views/home.ts
    - packages/ui/renderer/styles.css
  tests:
    - packages/ui/src/renderer/derive.test.ts
---

## Summary

Implements REQ-035. Adds a home/intent view to the desktop app aggregating: current bets (accepted hypothesis REQs with outcome targets, linked-WO state, untested-bet flags from the check derivation), awaiting human judgment (proposed DECs and draft REQs, linking into the approval queue and reader), and recently learned (newest sources, outcome sources distinguished and linked to the hypothesis they answer). Derived and stateless — rendering over existing documents and the existing check derivation; judgment actions route to existing surfaces. Design-first per WF-001 rule 7: a design source precedes implementation.

## In scope

- A design source (SRC) for the view, linked designed-by, before implementation
- The home/intent view in packages/ui (renderer + any sidecar reads it needs), entered from primary navigation
- Untested-bet and awaiting-judgment derivation reuse from core's existing check/pending machinery
- Tests for the view's derivation logic and rendering; shot-harness verification

## Out of scope

- New document types, statuses, or authoritative state
- Removing or demoting the board or any existing view
- Metrics ingestion or notifications
- Changes to core's check derivation beyond exposing what exists

## Requirements

- [[REQ-035]] — implements
- [[DEC-111]] — constrained-by
- [[SRC-050]] — derived-from

## Acceptance tests

- [x] The home view renders the three sections from existing documents; a hypothesis REQ shows outcome target and WO state; untested bets are flagged
- [x] Proposed DECs and draft REQs appear under awaiting judgment and link to where they are acted on
- [x] Outcome sources are visually distinct in recently-learned and link to their hypothesis
- [x] The view holds no authoritative state
- [x] UI suite and typecheck pass; shot-harness screenshots verify the view; terminal `veri check` zero issues

## Receipts

- 2026-08-26 — 82a9520 — packages/ui/src/renderer/derive.ts, packages/ui/src/renderer/derive.test.ts, packages/ui/src/renderer/views/home.ts, packages/ui/renderer/styles.css, veri/sources/SRC-053 (design, d39a1bb), veri/decisions/DEC-118 — claude-wo117 session: the intent home per SRC-053 — the existing Home view evolved: NEEDS REVIEW becomes AWAITING JUDGMENT (N gate crossings, same pendingDocs derivation and import grouping, rows route to the reader's review banner); a full-width CURRENT BETS card renders accepted hypothesis REQs with core's outcomeLabel target chip, either-direction linked-WO done counts (withdrawn excluded — the check's own linkage), and an epistemic state that is either the snapshot's untested-bet advisory (never recomputed) or the outcome sources that reported; RECENTLY LEARNED joins the grid with newest non-withdrawn sources, outcome sources distinguished by a supports/refutes/tests verdict-chip button opening the hypothesis (split row — two honest targets, no nested buttons). Derivations (currentBets, recentlyLearned) are pure renderer functions over the snapshot reading @verikb/core/pending; no new sidecar reads, no state. DEC-118 (proposed) records the choices. Validation: ui 358 tests pass, typecheck and bundle clean; terminal veri check 0 issues (16 pre-existing advisories); shot-harness verification of a fixture project (bets with evidence, untested-bet flag, verdict chips, judgment queue) and the self-hosted repo in dark (empty-bets teaching state). Deviations: SRC-053's approved: stamp placed by the session under Daniel's blanket pivot authorization (same provenance as SRC-051/SRC-052), flagged for his review.
