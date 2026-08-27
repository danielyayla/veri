---
id: DEC-128
type: decision
title: "The v1 proving ground is a small external greenfield for the front half, with Veri-on-Veri as continuous dogfood for the back half"
status: active
approved: 2026-08-27
created: 2026-08-27
updated: 2026-08-27
links:
  - id: REQ-040
    rel: constrains
  - id: SRC-062
    rel: derived-from
  - id: SRC-061
    rel: derived-from
  - id: REQ-035
    rel: informed-by
  - id: REQ-033
    rel: consistent-with
  - id: DEC-111
    rel: consistent-with
  - id: DEC-125
    rel: consistent-with
---

## Choice

[[REQ-040]]'s fourth acceptance criterion asks for one real project operated end-to-end through the skills — "idea → shipped WO → outcome source". **Veri itself cannot satisfy that criterion, structurally.** It carries 359 documents and a product thesis fixed in [[DEC-111]]; there is no discovery work left to do here, so `product-discovery`, `user-discovery`, and origin-stage `evidence-intake` have nothing to operate on. Veri can exercise `define → plan-work → implement → did-it-work → health` against real constraints, and nothing before that.

The proving ground is therefore split, and [[REQ-040]]'s criterion is amended to say which project proves which half:

- **A small external greenfield proves the front half.** Something the user would genuinely build anyway — a toy project will not generate the real decisions the skills exist to catch. This is where the skills are least proven and most novel, so a trial that exercised only the back half would be evidence of very little.
- **Veri-on-Veri is continuous dogfood for the back half**, not a substitute for the above. It has real work, real constraints, and an existing graph to keep healthy.

**One dimension of [[REQ-040]]'s metric is reclassified rather than dropped.** Decisions-with-recorded-alternatives stands at 127 of 127 before any skill exists — at ceiling, able only to stay flat or regress. It is kept as a **regression guard**, not as evidence of gain. The dimensions that can actually move are evidence links (26 of 41 requirements) and outcome sources (0 of 59 before [[SRC-062]]), and the bet is judged on those.

**Self-operation is accepted, with the refutation pre-registered.** The user designed the skills and is the only operator; self-confirming evidence is weak evidence, and there is no realistic alternative. The mitigation is that [[REQ-040]]'s refuting outcome — skills invoked once and abandoned, filed documents routinely withdrawn — is made countable over the trial rather than judged by impression afterwards.

**A prerequisite, not part of the run: close one learning loop by hand first.** Before the proving ground starts, an outcome source is filed for a shipped hypothesis manually, with no skill involved. Now done — [[SRC-062]] — and it paid for itself immediately: the measurement showed [[REQ-035]]'s metric was already eighty times past target before the intervention shipped, so the bet was unanswerable as specified. That is the cheapest possible test of whether [[REQ-040]]'s target is reachable at all, and it surfaced a metric-design failure that would otherwise have been inherited by the trial.

## Rejected alternatives

- **Veri itself as the sole proving ground.** Available, self-hosted, already instrumented, and it is where the work actually happens. Rejected because it cannot exercise discovery — the problem is defined, the thesis is fixed, and running `product-discovery` against a project with 359 documents would be theatre. It is also circular: the skills would be shaping the project that defines the skills, so a healthy graph proves the operator's diligence rather than the skills' effect.
- **An external greenfield as the sole proving ground.** Cleanest evidence, and it satisfies the criterion as literally written. Rejected as the *only* ground because it abandons the back-half signal Veri already generates for free, and because a greenfield's back half is necessarily shallow — few enough work orders that implementation discipline is never really tested.
- **A retrospective replay — re-run a past Veri feature through the skills.** Cheap, fast, and needs no new project. Rejected because the outcome is already known to the operator, so it tests recall rather than coaching; it cannot produce an honest hypothesis or an unbiased outcome source.
- **Dropping the saturated metric dimension entirely.** Tidier, but a metric at ceiling still carries information as a floor — losing it would mean a regression in decision quality went unmeasured.
- **Waiting for a second operator before running the trial.** Would materially strengthen the evidence, and should happen eventually. Rejected as a precondition because it blocks indefinitely on recruiting someone, and a pre-registered refutation recovers most of the value now.
- **Treating the hand-filed outcome source as part of the proving run rather than a prerequisite.** Rejected because its whole value is being unskilled: it establishes what the step costs a human without help, which is the baseline the skill must improve on.

## Rationale

Origin: the third grilling ticket on [[SRC-061]]'s frontier, and the first one where measurement rather than argument settled the question.

The decisive fact was found by scoring this repo against [[REQ-040]]'s own metric: 123 work orders completed, 59 sources, and zero `outcome-of` links. Veri had shipped for months and closed its learning loop exactly zero times — the final segment of the loop it exists to enforce had never once run in the project that invented it. That reframed the proving-ground question. The risk to [[REQ-040]] was never "will the skills coach well"; it was "will anyone perform the outcome step at all", and no amount of skill design answers that.

Hence the prerequisite, and hence its result mattering more than the choice of project. Filing [[SRC-062]] by hand took one session and immediately falsified the instrument: [[REQ-035]]'s median-time-to-judgment was 0.6h before the intent home shipped, against a 48h target. The bet was unanswerable before it was made. Had the proving ground run first, it would have inherited that failure mode and produced a confident-looking result about nothing.

The split between front and back halves follows from a structural fact rather than a preference. Discovery skills need an undefined problem to operate on, and Veri has not had one since [[DEC-111]]. Pretending otherwise would produce exactly the self-confirming evidence this decision is trying to avoid.

Reclassifying the saturated metric dimension rather than deleting it, and pre-registering the refutation rather than waiting for a second operator, are both the same move: keep the weak evidence, but label it honestly, so a later reader can tell what was demonstrated from what was assumed.
