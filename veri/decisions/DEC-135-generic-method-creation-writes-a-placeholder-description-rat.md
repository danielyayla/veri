---
id: DEC-135
type: decision
title: "Generic method creation writes a placeholder description rather than refusing"
status: active
approved: 2026-08-28
created: 2026-08-27
updated: 2026-08-28
links:
  - id: DEC-130
    rel: follows-from
  - id: WO-131
    rel: constrains
  - id: REQ-008
    rel: consistent-with
---

## Choice

`createDocument` writes a visible placeholder into a new method's
`description:` and an empty `requires: []`, and creates the document like
any other type.

[[DEC-130]] makes `description` and `requires` required frontmatter, and
makes methods an open collection — "author your own gate" must stay a
change to the project, never a change to Veri. Those two facts collide at
the one place every creation surface goes through: `createDocument`
promises "type + title in, a check-passing file out", and a method born
without those fields fails its own schema the instant it is loaded.

The placeholder is written to be unmistakable as one — it names what the
field is for and leads with `TODO` — because the field is the text an
emitted skill shell triggers on, and a plausible-sounding invention would
trigger on the wrong utterances. Nothing emits from it: the document is
born `draft`, and only an `accepted` method reaches the emitter.

## Rejected alternatives

- **Refuse creation without a description**, the way product refuses
  generic creation outright. Symmetrical with the sixth type and it never
  writes a word the author did not choose. Rejected because the two types
  differ exactly here: refusing product creation is correct (there is no
  fifth singleton to create), while refusing method creation would make
  authoring the fifteenth gate impossible through the ordinary door and
  push it back into hand-written files — the ownership [[DEC-130]] exists
  to grant, withdrawn at the point of use.
- **Add required `description`/`requires` parameters to `createDocument`
  and thread them through every creation surface.** The most honest
  shape, and where this probably lands once a filing tool for methods
  exists. Rejected for now as scope this work order does not carry: no
  surface has anything real to pass yet, so the parameters would exist
  only to be filled with the same placeholder one layer up.
- **Make `description` optional in the schema and enforce non-emptiness
  as a check rule.** Creation gets easy and the gap stays visible.
  Rejected because it re-opens what [[DEC-130]] closed: a silently absent
  description is a skill that triggers on nothing, and an emitter reading
  an optional field has nothing to validate against.
- **Derive the description from the title.** No placeholder text in the
  file and something readable on day one. Rejected as the worst option:
  it produces a real-looking trigger paragraph nobody wrote, and the
  failure mode — a gate that fires on the wrong utterances — is silent.

## Rationale

The required-field decision in [[DEC-130]] is right, and the open
collection in [[DEC-130]] is right; this is only about which of them
yields at the creation seam, and the answer is neither. A placeholder
keeps creation open and keeps the field required, and it moves the cost
to the one place that can pay it: the author, who has to replace an
obvious `TODO` before the user will approve the document.
