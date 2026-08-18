---
id: DEC-036
type: decision
title: Pending is one word in the UI
status: active
approved: 2026-08-18
created: 2026-08-18
updated: 2026-08-18
links:
  - id: SRC-016
    rel: informed-by
  - id: REQ-008
    rel: constrained-by
---

## Choice

Everywhere the UI speaks, a document awaiting the user's stamp is
**pending** — one word, one amber treatment — regardless of whether the
file says `status: draft` (requirement, workflow) or `status: proposed`
(decision). Status chips, palette rows, Home's NEEDS REVIEW card, review
banners, and gate copy all say *pending*; the palette accepts
`is:pending`, with `is:proposed` retained as an alias. The file formats
and per-type status vocabularies are untouched: raw frontmatter, `veri
check` messages, and the CLI keep `draft`/`proposed` exactly as
[[REQ-008]] defines them.

## Rejected alternatives

- **Renaming the statuses in the format** (both become `pending` in
  frontmatter) — a breaking format change requiring a migration
  (DEC-030) to fix what is purely a presentation problem; also loses the
  per-type lifecycle words that read naturally in raw files (`draft`
  requirement, `proposed` decision).
- **Keeping two words in the UI** — the status quo. Two words for one
  concept doubles the ontology a beginner must parse for zero
  information: the palette's own `is:proposed` filter already matches
  both, which is the system admitting the split is artificial.
- **A third umbrella term** ("awaiting review", "unratified") — longer,
  colder, and no more precise than *pending*, which the review banner
  copy already uses.

## Rationale

The concept count a new user must hold is Veri's scarcest budget
([[SRC-016]] scored simplicity and cognitive load 3/5, naming this pair
specifically). Draft-vs-proposed encodes only *which type* a document is —
information the type chip already carries. Collapsing the vocabulary at
the presentation layer buys the simplicity win at zero migration cost and
keeps files boring and stable, which is the DEC-002 posture: formats
outlive labels.
