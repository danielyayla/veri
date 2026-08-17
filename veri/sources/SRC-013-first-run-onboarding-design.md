---
id: SRC-013
type: source
title: Design handoff — First-run onboarding and connection verification
status: imported
created: 2026-08-17
updated: 2026-08-17
links:
  - id: WO-030
    rel: designs
  - id: REQ-013
    rel: designs
  - id: DEC-031
    rel: builds-on
---

Design approved by Daniel on 2026-08-17 (in-session review of the
prototype), satisfying the [[DEC-012]] gate for [[WO-030]].

Design handoff for [[WO-030]]'s three surfaces, filed as the
[[DEC-012]] gate artifact.

Files live in `design/first-run-onboarding/`:

- `README.md` — self-sufficient written spec: the welcome screen
  (cold-start only, three action cards routing into the existing
  SRC-007 picker → sheet flow, with the demo toggle pre-enabled for
  the sample path), the documentless empty states (home view START
  HERE card with the path-of-work row; sidebar ghost hint rows with
  hover-to-action swap), and the LIVE CHECK section of the agent
  connection panel (one button, one spawn, success or one of five
  named failure causes with exactly one action each), plus the
  runtime pre-check notice in the not-set-up hero. Copy is final.
- `first-run-onboarding.html` — self-running prototype, open in a
  browser. The scenario bar switches all twelve states; the Verify
  button in the rest state plays the busy → success transition.

The runtime mechanism the LIVE CHECK and pre-check depend on is
[[DEC-031]] (login-shell probe, configs keep `command: "node"`).
Constraints honored: no new design tokens, no liveness in the
sidebar footer, one-failure-one-action ([[SRC-002]]), files as the
source of truth — no onboarding flags, no cached verification
results ([[DEC-002]]).
