---
id: DEC-112
type: decision
title: "Hypothesis-without-outcome is an issue-tier check rule, not a schema refinement or advisory"
status: proposed
created: 2026-08-26
updated: 2026-08-26
---

## Choice

Implementing REQ-032 (WO-114), the missing-outcome rule lands as a dedicated `veri check` issue (`hypothesis-without-outcome`), not a zod superRefine and not an advisory. The schema accepts `kind: constraint | hypothesis` (optional; absent means constraint) and an optional `outcome: {metric, target}` where target accepts a string or bare YAML number, normalized to a string at parse. The effective-kind default lives in one shared helper pair (`requirementKind`/`outcomeLabel`) on the dependency-free `@verikb/core/pending` subpath so the CLI, context assembly, and the browser-bundled renderer agree without re-deciding it. Rendering: context packages spell out the kind on every requirement heading (constraint included) and ship a declared outcome as its own `Outcome:` line; the compact CLI list marks only hypotheses (` · hypothesis · outcome: ...`), leaving the kind-less constraint lines byte-identical; the app's frontmatter card always shows a kind row for requirements plus an outcome row when declared. No on-disk format bump: old readers preserve the new keys via REQ-001 passthrough, so nothing misparses (WO-104's bump rule does not trigger).
