---
id: DEC-113
type: decision
title: "Outcome links: coined rel vocabulary, scoped issue-tier validation, and evidence riding its requirement"
status: active
approved: 2026-08-27
created: 2026-08-26
updated: 2026-08-27
links:
  - id: REQ-033
    rel: implements
  - id: WO-115
    rel: derived-from
  - id: DEC-112
    rel: relates-to
---

## Choice

Implementing REQ-033 (WO-115): an outcome source links the requirement it reports on with rel tests/supports/refutes and the shipping work order with the coined rel outcome-of. Validation is issue-tier (invalid-outcome-link) but deliberately scoped: links FROM a source are fully direction-checked (an outcome rel must target a requirement, outcome-of a work order), while on every other document the bare words tests/supports/refutes keep their free-text meaning and only the two unambiguous mistakes are flagged — an outcome rel pointing AT a source (the evidence edge written backwards) and any non-source use of outcome-of. The untested-bet finding is an advisory (never an issue) firing only for a non-withdrawn, non-retired hypothesis with at least one linked work order, all of them done, and no source linking it with an outcome rel. Context assembly promotes the outcome sources of a hop-1 requirement into the core ring (they never fall to the hop-2 map) and names them on the requirement itself as an "Outcome evidence:" line. The vocabulary lives on the dependency-free @verikb/core/pending subpath (OUTCOME_RELS, isOutcomeRel, OUTCOME_OF_REL), the DEC-112 placement.

## Rejected alternatives

Claiming the full outcome vocabulary issue-tier everywhere — the bundled skiff demo (and plausibly user corpora) already uses a WO-to-REQ "supports" link in its ordinary English sense; retroactively flagging free-text rels breaks existing projects for no evidence gain. Advisory-tier validation of source-origin outcome links — a misdirected evidence edge silently fails to count for the untested-bet advisory and context inclusion, exactly the silent no-op DEC-058 forbids. shipped-by/observes as the source-to-WO rel — outcome-of names the relation from the evidence side, matching the tests/supports/refutes direction. Firing the untested bet on a hypothesis with no linked work orders — nothing has shipped, so there is nothing reality could have reported on yet. Leaving outcome sources in the hop-2 context map in layered mode — "what reality said" is part of the requirement's story and must ship with it, not sit behind a retrieval hop.

## Rationale

The learning loop closes only if outcome evidence is machine-legible where tools look: check reads the edges for the untested bet, and assembly reads them to put evidence beside the bet it tests. Scoping the issue-tier claim to the source side (plus the two unambiguous mistakes) keeps that legibility honest without converting Veri's free-text rel convention into a breaking vocabulary. Advisory tier for the untested bet is REQ-033's own posture: Veri makes the question unavoidable; a human judges the answer. Origin: implementing WO-115.
