---
id: SRC-006
type: source
title: Design handoff — Approval gate UI (review queue, approve flow, gated WOs)
status: imported
created: 2026-08-10
updated: 2026-08-10
links:
  - id: REQ-008
    rel: designs
  - id: WO-017
    rel: designs
---

Design approved by Daniel on 2026-08-10 (in-session review of the
prototype and spec).

High-fidelity design handoff for the approval-gate UI: agent-filed
decisions/requirements stay `proposed`/`draft` and non-binding until
approved in the app. Produced with the design plugin's process on top of
the navigation-model handoff (SRC-005) — no new tokens, no new surfaces,
only new uses of existing ones. Files live in `design/approval-gate/`:

- `README.md` — self-sufficient written spec: the NEEDS REVIEW card on
  Home, pending markers in sidebar/palette (`is:proposed` filter), the
  review banner with "What approving means" disclosure, the approve
  popover showing the exact frontmatter diff (`status` flip +
  `approved:` stamp), the request-changes note composer (file-based
  `## Review notes`), and gated-work-order chips with disabled kickoff
  actions. Copy is final.
- `approval-gate.html` — self-running prototype, open in a browser.
  Scenario bar switches home / review / approved / gated-wo; the
  approve popover and note composer are live.

Design principles carried from [[DEC-002]]: approval is a frontmatter
edit to the markdown file, shown verbatim before it happens; pending
documents are always visible and marked, never hidden; approve is
deliberate (one confirm step, no bulk approve). Rejection/deletion is
deliberately not a button — discarding a proposal is a git act.

UI implementation ([[WO-017]]) depends on the non-UI gate mechanics
([[WO-016]]: schema `proposed` status, check rules, proposal-only MCP
writeback) shipping first, and on [[REQ-008]] being accepted.
