---
id: REQ-040
type: requirement
title: "Veri ships a skill library that coaches users through the lifecycle loop, not just the commands"
status: draft
kind: hypothesis
outcome:
  metric: skill-operated project graph health — share of requirements with evidence links, decisions with recorded alternatives, and hypotheses with outcome sources, plus continued skill use after first invocation
  target: one real project operated end-to-end through the skills produces a zero-violation graph with every shipped hypothesis carrying an outcome source, and the user keeps the skills installed
created: 2026-08-27
updated: 2026-08-27
links:
  - id: SRC-060
    rel: derived-from
  - id: DEC-111
    rel: constrained-by
  - id: REQ-008
    rel: constrained-by
---

Veri distributes an installable skill library ([[SRC-060]]) whose skills staff the loop's semantic gates conversationally: discovering what to build, defining requirements, choosing tradeoffs, planning and steering bounded work, judging outcomes, and maintaining the record over time. The skills coach the thinking Veri is meant to capture — a user can start from something as vague as "I have an idea" or "I want to change auth" and be progressively guided into durable, linked documents.

This is a bet, not a constraint: the outcome that would confirm it is that projects operated through the skills produce a healthier graph than raw-tool usage — evidence-linked requirements, decisions with recorded alternatives, hypotheses that actually receive outcome sources — and that users keep the skills installed rather than bypassing them. The refuting outcome is skills that get invoked once and abandoned, or documents the skills file that users routinely withdraw as noise.

Skill-library skills obey the promotion boundary absolutely: everything they file is draft/proposed, and no skill writes an `approved:` stamp or runs promotion except as the relay of an explicit per-document user verdict ([[REQ-008]], [[DEC-111]]).

## Acceptance criteria

- [ ] A default set of skills covering the minimal loop (wayfinder, product-discovery, evidence-intake, define, decide, plan-work, implement, did-it-work, health) is installable as a package
- [ ] Each skill's output lands as draft/proposed documents only; no skill can promote a document of its own accord
- [ ] Each skill ends by naming the next gate: which documents await which act, and which skill picks them up
- [ ] At least one real project has been operated end-to-end (idea → shipped WO → outcome source) using only the skills, and the resulting graph passes `veri check` with zero violations
