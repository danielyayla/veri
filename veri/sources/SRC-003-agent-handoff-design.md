---
id: SRC-003
type: source
title: Design handoff — Agent handoff actions (kickoff prompt + session picker)
status: imported
created: 2026-08-08
updated: 2026-08-08
links:
  - id: REQ-007
    rel: designs
  - id: WO-011
    rel: designs
---

High-fidelity design handoff for the agent handoff actions required by
[[REQ-007]] and implemented by [[WO-011]], produced with the design
plugin's handoff process. Files live in `design/agent-handoff/`:

- `README.md` — self-sufficient written spec: button row replacing the
  "Serve via MCP" toggle, the exact kickoff-prompt template, the agent
  picker with all four row states (detected-connected, detected-not-
  connected, not-installed, copy-only), launch/failure behavior,
  accessibility, and out-of-scope guardrails. Reuses the SRC-002 token
  sheet verbatim; no new tokens.
- `agent-handoff.html` — interactive prototype of the context panel and
  picker (open in a browser). A `scenario` switcher (`mixed | all |
  none`) drives the three detection situations; copy and launch actions
  show their real feedback states.

The picker renders whatever the agent adapter registry reports, so the
design is provider-neutral: new adapters add rows, not UI. Web-only chat
apps are deliberately non-launchable and steer to the kickoff prompt.
