---
id: DEC-122
type: decision
title: "Source kinds default to reference; the intuition-only bet begins at acceptance and outcome evidence clears it"
status: active
approved: 2026-08-27
created: 2026-08-27
updated: 2026-08-27
links:
  - id: WO-122
    rel: decided-during
  - id: REQ-038
    rel: implements
  - id: DEC-113
    rel: builds-on
---

## Choice

Implementing [[REQ-038]] ([[WO-122]]):

1. **The kind vocabulary is `design`, `user-feedback`, `metric`, `external-eval`, `investigation`, `outcome`, plus `reference` — and absent means `reference`.** The migration-free default is a *neutral* member, not `design`: the existing corpus is imported material of every stripe, and defaulting to the dominant class would label evidence falsely. `sourceKind()` decides the default once on the dependency-free subpath (the `requirementKind` pattern, DEC-046).

2. **The `kind` frontmatter field is shared with requirements**, not a second field: one key, per-type vocabulary, validated per-type by the schema. `requirementKind` guards against the widened union by matching `hypothesis` explicitly.

3. **The intuition-only advisory begins at acceptance.** Drafts are proposals, not bets — flagging them would advise every starter bundle and every `veri new requirement` from minute zero. The gate crossing into `accepted` is where the origin question starts to matter; retired and withdrawn have left play.

4. **Inbound outcome evidence clears the advisory.** A requirement some source `tests`/`supports`/`refutes` ([[REQ-033]]) is a tested bet whatever its origin links say — flagging it intuition-only while reality has already reported would be absurd. Clearing requires either a `derived-from` link to an existing source or at least one non-withdrawn inbound outcome link.

5. **The demo corpus canonicalizes its evidence rels to `derived-from`** (was `raw-material`/`survey-evidence`/`cited`): the demo teaches the current convention, and free-form rels do not count as evidence — the check reads the canonical rel, never guesses at synonyms.

6. **Visibility rides existing surfaces**: the context package's source headings carry the effective kind; `PaletteHit` carries the declared kind so search on every surface can show it; `file_source` accepts a validated `kind` and `createDocument` refuses one on any non-source type.

## Rejected alternatives

- **Defaulting absent to `design`** — the dominant class in this repo, but a false label on every non-design source; a neutral default lies about nothing.
- **A separate `source_kind` field** — two kind keys with one meaning each; the shared key with per-type vocabulary matches how `status` already works across types.
- **Flagging draft requirements too** — REQ-038's letter permits it, but every seeded starter and freshly created requirement would advise from birth; noise at minute zero teaches people to ignore the advisory tier.
- **Counting any link to a source as evidence** — free-form rels (`cited`, `raw-material`) would make the advisory unfalsifiable and the canonical rel meaningless; one rel, checkable, is the DEC-058 posture applied to provenance.
- **A blocking issue instead of an advisory** — intuition is a legitimate origin; REQ-038 is explicit that the check informs and never gates.

## Rationale

The advisory pair now brackets an accepted requirement's life — intuition-only asks "where did this come from?", untested-bet asks "did it work?" — and both clear through the same evidence door (sources, canonical rels), with one evaluation site each in core. The acceptance-gate scoping keeps day-zero projects quiet while making the standing evidence gap of a mature corpus visible: this repository surfaces 27 intuition-only requirements the moment the check lands, which is the point. Origin: [[SRC-056]].
