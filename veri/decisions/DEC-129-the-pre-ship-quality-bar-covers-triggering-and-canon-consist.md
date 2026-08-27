---
id: DEC-129
type: decision
title: "The pre-ship quality bar covers triggering and canon consistency only; coaching efficacy is post-ship evidence, not a gate"
status: active
approved: 2026-08-27
created: 2026-08-27
updated: 2026-08-27
links:
  - id: REQ-040
    rel: constrains
  - id: DEC-125
    rel: builds-on
  - id: DEC-128
    rel: consistent-with
  - id: REQ-025
    rel: consistent-with
  - id: DEC-111
    rel: consistent-with
  - id: SRC-062
    rel: informed-by
  - id: SRC-061
    rel: derived-from
---

## Choice

The skill library's quality bar splits three problems that [[SRC-061]] had treated as one, and gates only the two that can be measured before shipping.

**In the pre-ship gate:**

1. **Shell triggering.** A committed corpus maps utterances to the skill that should fire — including near-misses between adjacent gates (`define` versus `decide`, `plan-work` versus `implement`) and a negative set that should fire nothing. The floor is expressed as **no regression against the corpus, plus zero false triggers on the negative set** — deliberately not a percentage. On a corpus of a few dozen cases a percentage is noise, and the failure that gets a library uninstalled is a skill firing when nobody wanted it, not one failing to fire. The corpus's coverage, not its score, is the artifact worth defending.

2. **Method–canon consistency.** [[DEC-125]] made method documents Veri documents, so `veri check` can hold them. A method document declares the gate it staffs and links the canon it restates. This closes the residue [[SRC-061]] left open — how far a method document may restate [[WF-001]]'s rules before the two can disagree — by making restatement *linked* rather than forbidden, so a rule change surfaces every method document that carries it.

**Explicitly out of the pre-ship gate:**

3. **Coaching efficacy** — whether the interview actually produces good requirements, real alternatives, and hypotheses that receive outcome sources. This is unmeasurable before shipping and belongs to [[DEC-128]]'s proving ground as post-ship evidence against [[REQ-040]]'s outcome. It is named here so that no one later mistakes a green gate for evidence that the coaching works.

**Blocking versus advisory follows Veri's existing two-tier vocabulary** ([[REQ-025]]: the gate holds on every pull request) rather than inventing a third. Triggering-corpus regressions and canon-consistency violations are **issues** and fail the build. Decay signals are **advisories** — a method document unreviewed for months sits in the same family as the untested-bet flag: informative, never false, never blocking.

## Rejected alternatives

- **One quality bar covering all three problems, efficacy included.** The intuitive shape, and the one [[SRC-061]] implied by naming a single "quality bar" frontier item. Rejected because it can only resolve two ways, both bad: the gate blocks release until efficacy is demonstrated, which cannot happen pre-ship, or efficacy gets a cheap proxy and a green gate is read as proof the coaching works. [[SRC-062]] is fresh evidence for how that fails — a metric chosen because it was cheap to derive rather than because it tracked what mattered, already at ceiling before the intervention.
- **A percentage floor on triggering accuracy (e.g. 90%).** Legible and conventional. Rejected because a percentage over a few dozen hand-written cases measures corpus composition more than skill quality, invites tuning the corpus to the number, and weights a missed trigger the same as a false one when only the latter drives uninstalls.
- **No pre-ship gate at all — ship and let the proving ground judge everything.** Consistent with the argument that efficacy is what matters. Rejected because triggering and canon consistency are cheap to check and expensive to discover in the field, and because a method document contradicting [[WF-001]] is a correctness bug, not a matter of taste.
- **Forbidding method documents from restating canon at all.** Would eliminate drift by construction. Rejected because coaching necessarily restates the rules it coaches; the workable constraint is that the restatement be traceable, not absent.
- **A third severity tier for skills, between issue and advisory.** Rejected as taxonomy bloat under [[DEC-111]]'s filter; the existing two tiers already express "fail the build" and "inform the human", which is the whole distinction needed.
- **Gating on `claude plugin eval` specifically.** A natural fit while the plugin was assumed to be the product, but [[DEC-125]] made the harness shell a generated pointer rather than the artifact. The corpus should test the trigger descriptions the emitter produces, whatever harness consumes them; binding the gate to one vendor's eval runner would reintroduce the coupling DEC-125 rejected.

## Rationale

Origin: the last grilling ticket on [[SRC-061]]'s frontier.

The decision is mostly an act of separation. "Quality bar" sounded like one question while it stood on the map, and answering it required noticing it was three questions with three different instruments — an eval corpus, `veri check`, and a proving ground running for months. Almost all the risk in a quality bar is that the easy-to-measure part silently stands in for the part that matters, which is precisely the failure [[SRC-062]] documented for [[REQ-035]]: median-time-to-judgment was cheap to derive from the corpus and already eighty times past target before the intervention shipped. Naming efficacy as explicitly out of the gate is therefore the load-bearing clause, not an omission.

That method documents are checkable at all is a dividend of [[DEC-125]] that was not visible when [[SRC-061]] charted this item. Choosing `veri/` over a plugin was argued on amendability and context-package reach; it also happens to put the method under the same gate as every other document, which is what makes canon consistency mechanical rather than editorial. The residue SRC-061 left open — how much restatement is too much — dissolves once restatement must carry a link: the question stops being "how much" and becomes "traceable or not".

Expressing the triggering floor as no-regression-plus-zero-false-positives rather than a percentage follows the same instinct as [[DEC-069]]'s committed bundle diffed in CI: prefer a check that fails on change from a known-good artifact over a check that scores against a threshold someone must defend. The corpus is the artifact; the gate just says it did not get worse.
