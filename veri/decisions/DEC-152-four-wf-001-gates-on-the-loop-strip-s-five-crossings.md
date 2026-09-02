---
id: DEC-152
type: decision
title: "Four WF-001 gates on the loop strip's five crossings"
status: proposed
created: 2026-09-02
updated: 2026-09-02
links:
  - id: WO-163
    rel: constrains
---

## Choice

The Home loop strip (WO-163, SRC-076 §The Loop) places WF-001's four human gates on the six-stage strip's five crossings as: intent at Plan → Design; decision and dispatch sharing Design → Build (the marker is amber when either pends); done at Test → Deploy; Build → Test and Deploy → Maintain carry no human gate and always render the green "fires on commit" marker. Two count-line wordings deviate from the mockup where the snapshot has no matching fact: Plan counts filed evidence sources (the mockup's "unfiled" intake never reaches the snapshot — the import sheet is transient, and band breaches are not a check verdict that exists), and Test reads "clean" in HEALTH's own register instead of "checks green".

## Rejected alternatives

- **Intent + decision together at Plan → Design, dispatch alone at Design → Build** — reads the intent and decision stamps as one act; they are distinct gates with distinct queues (GATE_ORDER), and a pending DEC would color a crossing the draft-REQ queue owns.
- **Four connectors, one per gate** — breaks the six-stage geometry the design canon fixes; the strip would no longer be the mockup.
- **A marker per gate stacked on the same crossing (two dots between Design and Build)** — visual noise the mockup explicitly avoids; the legend explains one dot per crossing.
- **Counting "unfiled" intake and "breaches" for Plan as the mockup's fixture copy shows** — those facts do not exist in the snapshot; inventing them would violate degrade-loudly (PRD-003 §6) and put a number on screen no other surface can corroborate.

## Rationale

The mockup draws six stages joined by exactly five connectors, but WF-001 names four gates, so at least one crossing must aggregate or sit empty. Dispatch is unambiguously the crossing into Build (bounded work begins on the user's dispatch gesture), and the decision stamp is what clears the way for it, so the two share the Design → Build crossing; intent stands alone where evidence becomes intent. The two green crossings preserve the design's teaching point — between your gates the loop runs itself. Pending-ness reads gateQueue's counts (WO-162), so the strip can never disagree with the Gate Queue about what waits. Count lines state only snapshot-visible facts, per PRD-003 §6 — no count is invented to match illustrative mockup copy.
