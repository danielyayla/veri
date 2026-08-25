---
id: DEC-086
type: decision
title: "A multiply-forbidden edge takes its strictest declared severity; severity-free corpora render byte-identical"
status: active
approved: 2026-08-25
created: 2026-08-25
updated: 2026-08-25
links:
  - id: DEC-062
    rel: follows-from
  - id: DEC-061
    rel: follows-from
  - id: WO-069
    rel: constrains
---

## Choice

Two choices [[DEC-062]] left to the implementer, fixed together because they
define how declared severity meets the edges of the mechanism.

**Strictest severity wins on a multiply-forbidden edge.** When several
active decisions forbid the same edge and their constraints disagree about
severity — one says `error`, another says nothing — the observed violation
is a check issue: any forbidding constraint declaring `error` promotes it.
Agreeing on `allowed: false` while differing on severity is not a conflict
([[DEC-061]] reserves conflicts for allowed-vs-forbidden contradictions),
and the finding still reports once, anchored on the oldest forbidding
decision with every forbidding DEC in `forbiddenBy` — DEC-061's anchoring
untouched by the split.

**Severity is projected and rendered only where declared.** `ArchRule`
carries `severity` exactly when the constraint declares it; an absent field
stays absent in the compiled projection rather than being normalized to
`advisory`. `veri architecture` grows its severity column only when at
least one compiled rule declares a severity (undeclared rules then show the
default, `advisory`); the error-violations section (`Issues — error-severity
violations`) appears only when one fires; and the advisory violations
section's empty line reads `(none at advisory severity)` when error
violations exist, since "observed imports respect every active constraint"
would be false. The result: a corpus with no severity fields — including
this repository under [[DEC-060]] — produces byte-identical `veri check`
and `veri architecture` output before and after the upgrade.

## Rejected alternatives

- **Weakest (or newest) severity wins on a multiply-forbidden edge** — a
  later soft restatement of a boundary would silently defuse an approved
  hard rule without superseding it; demotion should be the explicit act
  DEC-062 made escalation.
- **Reporting the same edge twice, once per severity tier** — double-reports
  one code problem through both tiers at once, the exact shape [[DEC-061]]
  rejected for conflicted edges.
- **Normalizing absent severity to `advisory` in the projection** — erases
  the declared/default distinction every surface downstream needs (the WO
  requires rules without the field to project unchanged), and would force
  the printout to either label every historical rule or special-case the
  default anyway.
- **Always printing the severity column** — breaks byte-identical output
  for every existing corpus to display a value nobody declared; the column
  earning its place only when severity enters the corpus keeps the WO-066
  printout stable.

## Rationale

DEC-062 settles what severity means; these are the two seams it does not
touch: aggregation across agreeing-but-differing rules, and representation
of the default. Strictest-wins keeps every approved hard boundary hard
regardless of what softer restatements accumulate around it, which is the
conservative reading of "blocking power arrives via the user's stamp" — a
stamped `error` constraint cannot be muted by anything short of retiring
its decision. Declared-only projection makes the dogfood guarantee
structural rather than coincidental: the mechanism cannot change any
severity-free corpus because absent fields never acquire a representation.
