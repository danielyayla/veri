---
id: DEC-062
type: decision
title: "Architecture constraints declare their severity; error-severity violations are check issues"
status: superseded
superseded_by: DEC-144
approved: 2026-08-25
created: 2026-08-20
updated: 2026-09-01
links:
  - id: DEC-058
    rel: extends
  - id: DEC-025
    rel: follows-from
  - id: DEC-061
    rel: follows-from
  - id: REQ-022
    rel: satisfies
---

## Choice

Each architecture constraint ([[DEC-058]]) may carry an optional `severity` field:

```yaml
architecture:
  constraints:
    - from: core
      to: [api, web]
      allowed: false
      severity: error   # advisory (default) | error
```

`advisory` (the default, and the behavior WO-067 shipped) keeps violations in the grey tier: informational, never counted, never blocking. `error` promotes a violation of that rule to a **check issue**: it is counted, renders amber through the existing issue pipeline (topbar chip, HEALTH card), and fails `veri check` with exit 1 — build-blocking in CI.

Three boundaries of the rule: severity attaches to the **constraint**, not the decision, so one decision may govern both hard and soft boundaries; conflicts remain issues regardless of severity; and [[DEC-061]]'s unanimity rule is severity-independent — a conflicted edge produces no violation at any severity, because the conflict issue owns that edge until one decision is retired.

Because severity rides the constraint on a governed decision, blocking power arrives only through the user's approval stamp ([[REQ-008]]): an agent can propose a hard boundary, but only the user can make the build fail on it.

## Rejected alternatives

- **Keeping all violations advisory (the WO-067 posture as permanent)** — assumes a code-level architectural violation is inherently softer than a documentation conflict, which inverts reality for load-bearing boundaries; Daniel's review directed that Veri distinguish informational drift from a build-blocking violation.
- **A global enforcement switch (project-wide "violations block" setting)** — severity is a property of the boundary, not the project: the same codebase has walls (core purity) and preferences; and a config knob outside the decision corpus has no approval story, the exact argument that rejected `veri/modules.yaml` in [[DEC-059]].
- **Severity on the whole decision rather than per constraint** — forces an artificial decision split the day one ruling covers both a hard and a soft edge, scattering policy that stands together.
- **A third `warning` level** — `veri check` has exactly two tiers (issues and advisories, [[DEC-025]]) and every surface is built on that pair; a middle tier adds vocabulary without adding a behavior. Revisit on evidence two levels are insufficient.
- **Deriving severity from rule age or violation count** — enforcement is intent, and intent is declared by the rule's author, not inferred by machinery.

## Rationale

DEC-025's "drift informs, never blocks" was ruled for *derived* findings — template structure, receipt verification, stamp drift — where the machine infers a mismatch nobody explicitly legislated. An architecture constraint is different in kind: a human wrote the rule, chose its scope, and stamped it. The author of a boundary is the right authority on its enforcement, and encoding severity in the constraint keeps intent and enforcement in one governed, supersedable place — the same argument that put the constraints on decisions in the first place ([[DEC-058]]). Defaulting to advisory keeps every existing corpus (including [[DEC-060]], which carries no severity fields) behaving exactly as today; escalation is an explicit, approved act.
