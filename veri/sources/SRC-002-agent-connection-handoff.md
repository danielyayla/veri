---
id: SRC-002
type: source
title: Claude Design handoff — Agent connection panel
status: imported
created: 2026-08-07
updated: 2026-08-07
links:
  - id: REQ-005
    rel: designs
---

High-fidelity design handoff for the MCP connection panel required by
[[REQ-005]], produced by Claude Design from the requirements handoff.
Files live in `design/agent-connection-handoff/`:

- `README.md` — self-sufficient written spec: all five states, exact
  copy, design tokens, check/repair behavior, state management, and the
  PRD's out-of-scope guardrails. Colors/typography/spacing/copy are
  final ("recreate pixel-perfectly").
- `agent-connection.html` — full interactive prototype (open in a
  browser). The screen is the `<!-- ===== AGENT CONNECTION ===== -->`
  block; a `mcpScenario` prop (`notsetup | healthy | broken | external |
  conflict`) switches states for review.
- `support.js` — prototype support script, reference only.

Known correction: the spec's "About the Design Files" line calls the app
"Tauri-style"; the shell is Electron per [[DEC-008]]. The spec defers to
codebase conventions, so this changes nothing. Implementation is tracked
in [[WO-007]].
