---
id: PRD-003
type: product
title: "Principles"
status: draft
created: 2026-08-27
updated: 2026-08-27
links:
  - id: DEC-111
    rel: derived-from
  - id: SRC-056
    rel: derived-from
---

1. **Humans define and revise intent; agents execute within intent**
   ([[DEC-111]]). Human gates sit at semantic boundaries — evidence →
   requirement, requirement → decision, implementation → product
   judgment — never at every action.

2. **Gated or derived, never freeform.** Everything in veri/ either
   carries the lifecycle machinery (status, approval stamp, links) or
   is materialized from checkable state. A file that is neither is the
   wiki we refused to build: comprehensive memory without accountable
   memory ([[SRC-056]]).

3. **Accountability of memory over comprehensiveness of memory.** A
   small set of checkable documents beats an unbounded taxonomy. New
   types and new files pass DEC-111's filter: does this improve human
   judgment, preserve intent, steer agents, or close the learning
   loop?

4. **One evaluation site per verdict.** Every epistemic judgment the
   system makes — untested bet, stale claim, design gate — is computed
   in core once and read by every surface, so no surface can disagree
   with `veri check`.

5. **Evidence never auto-promotes.** Outcome sources, refuting
   evidence, drift advisories — all of it informs; judging what it
   means and revising intent is the user's act.

6. **Degrade loudly, never silently.** A check that cannot run states
   why (skips); a rule that cannot fire is an issue; silent truncation
   and silent no-ops are defects.

7. **The loop closes through the evidence door.** Reality's answer to
   a shipped change re-enters as a source linked to the bet it tests —
   the same four types, no side channels.
