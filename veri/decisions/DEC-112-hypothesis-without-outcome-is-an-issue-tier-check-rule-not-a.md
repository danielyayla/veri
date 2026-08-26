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

## Rejected alternatives

- **zod superRefine (schema-tier violation)** — a half-drafted hypothesis would fail parse entirely, dropping the document from the corpus and cascading broken-link issues everywhere it is referenced; the document should still parse, render, and round-trip while check names the gap.
- **Advisory tier** — an untestable bet is exactly the DEC-058 posture (a rule that cannot fire is an issue, never a silent no-op), and since no existing document declares `kind: hypothesis`, issue-tier is additive with zero migrations.
- **Rendering `constraint` on every CLI list line** — churns every existing requirement line in the compact human listing for no information gain; absent-means-constraint is the documented default, so marking only the bets keeps the exception visible.
- **Defaulting `kind: constraint` into parsed frontmatter** — round-tripping would invent a field the file never declared; the default belongs to readers (one helper), not to the parsed record.

## Rationale

A hypothesis is a bet, and a bet with no declared metric and target can never be confirmed or refuted — flagging it hard keeps the epistemic distinction REQ-032 introduces honest, while leaving the document itself parseable, renderable, and fixable. Placing the default in one shared helper (rather than the schema or each surface) is what makes "absent means constraint" hold *everywhere* by construction. Origin: implementing [[WO-114]].
