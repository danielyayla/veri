---
id: REQ-032
type: requirement
title: "Requirements distinguish constraints from hypotheses, and hypotheses carry an outcome target"
status: accepted
approved: 2026-08-26
created: 2026-08-26
updated: 2026-08-26
links:
  - id: SRC-050
    rel: derived-from
---

Not all requirements carry equal epistemic certainty. "The application must not lose user data" is a **constraint** — it must be satisfied and stay satisfied. "Showing the project map during onboarding will improve activation" is a **hypothesis** — a belief to be tested by shipping and observing. Treating both identically hides the difference between what we know and what we are betting on.

Every requirement declares its kind in frontmatter: `kind: constraint` or `kind: hypothesis`. A hypothesis additionally declares the outcome that would confirm or refute it — a metric and a target (e.g. `outcome: {metric: time-to-first-success, target: "< 5 minutes"}`). Veri's tooling understands the difference: constraints are satisfied by implementation and verified by acceptance criteria; hypotheses are only *tested* by implementation, and remain open until outcome evidence arrives (see the companion requirement on outcomes entering as sources). Existing requirements default to `kind: constraint` so the field is additive, not a migration.

The distinction is one frontmatter field on the existing REQ type — deliberately not a new document type and not a new work-order status machine.

## Acceptance criteria

- [ ] The REQ schema accepts `kind: constraint | hypothesis`; absent means constraint.
- [ ] A hypothesis REQ can declare an outcome metric and target in frontmatter, and `veri check` flags a hypothesis with no outcome declared.
- [ ] Kind is visible wherever a requirement is rendered (CLI, context packages, UI).
- [ ] No existing document requires editing for the check suite to pass after the field lands.
