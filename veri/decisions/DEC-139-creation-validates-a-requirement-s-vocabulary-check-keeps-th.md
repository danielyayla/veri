---
id: DEC-139
type: decision
title: "Creation validates a requirement's vocabulary; check keeps the epistemic judgment"
status: proposed
created: 2026-08-28
updated: 2026-08-28
links:
  - id: WO-137
    rel: derived-from
  - id: REQ-032
    rel: implements
  - id: DEC-098
    rel: constrained-by
---

## Choice

`createDocument` gains `kind` for requirements and an `outcome: {metric, target}` block (WO-137), and validates exactly two things: that the kind is one of `REQUIREMENT_KINDS`, and that a declared outcome carries both halves non-empty. It does not judge whether a given requirement *should* have an outcome. A hypothesis filed with no outcome is written, and `veri check` reports it as `hypothesis-without-outcome` — the issue-tier rule that already exists. An outcome declared on a constraint is likewise written, matching the schema, which has always accepted the field independent of kind.

The vocabulary itself moves to `REQUIREMENT_KINDS` on the dependency-free `pending` subpath beside `SOURCE_KINDS`, so the schema, creation, and the MCP tool validate against one list (the DEC-046/DEC-112 placement). The `file_requirement` tool stays permissive in the same way, and says so in its response: filing a hypothesis with no outcome returns the id *and* the sentence that check calls it a violation.

## Rejected alternatives

- **Creation refuses a hypothesis with no outcome.** The strongest alternative, and the one REQ-009's contract argues for — "type + title in, a check-passing file out" — since this choice knowingly lets a caller mint a file that fails `veri check`. Rejected on scope and on posture: WO-137 puts mandatory outcomes explicitly out of scope, and Veri's shape throughout is that mechanics permit and `check` reports, with a human judging. A refusal would also strand the honest half-draft — a session that has the bet but not yet the metric would be forced to file it as a constraint, which is the precise laundering REQ-032 exists to prevent. Filing it as a visibly incomplete hypothesis is strictly better than filing it as an invisible constraint.
- **Refuse `outcome` when the kind is `constraint` or absent.** Rejected: the schema accepts it, `parse` round-trips it, and no check flags it, so refusing at creation would make the tool surface stricter than the file format — a document legal on disk that no surface can create. If an outcome on a constraint is wrong, that belongs in `check` where every existing document is held to it, not in creation where only new ones are.
- **A `hypothesis-without-outcome` warning in the tool description only.** Rejected as too quiet: the description is read once at tool-list time, the response is read every filing. Both now carry it.
- **Keep the two-word vocabulary inline in `schema.ts`.** Rejected: three copies (schema, creation, tool) is how vocabularies drift, and `SOURCE_KINDS` already established where the shared list lives.

## Rationale

The line this draws is the one Veri draws everywhere else: surfaces validate *form*, `check` judges *substance*, and the user judges what check surfaces. Creation knows what a legal kind looks like; it does not know whether this particular bet's metric has been decided yet, and inventing that judgment at the write path would push sessions toward the one outcome that must never be easy — filing a bet as a constraint. Origin: implementing [[WO-137]].
