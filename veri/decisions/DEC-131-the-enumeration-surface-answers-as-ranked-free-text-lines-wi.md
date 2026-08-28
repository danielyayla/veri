---
id: DEC-131
type: decision
title: "The enumeration surface answers as ranked-free text lines, with closed filter vocabularies and a queue whose head comes from nextDispatchable"
status: active
approved: 2026-08-28
created: 2026-08-27
updated: 2026-08-28
links:
  - id: WO-127
    rel: decided-during
  - id: REQ-041
    rel: constrains
---

## Choice

Implementing [[REQ-041]] items 1 and 2 (WO-127), the two read tools take
this shape:

1. **Answers are text lines, not JSON.** `list_documents` emits one line
   per hit — `id  type  status[ (pending)]  updated <date>  <path>
   <title>` — with the title last so it may contain anything, preceded
   by a count line; `get_queue` emits a `Ready (n)` block then an
   `In progress (n)` block. This is `search`'s line shape minus the
   score, not `run_check`'s JSON: enumeration over a real corpus is
   hundreds of rows, and the line form costs roughly a third of the
   tokens per row while staying trivially parseable.
2. **No cap, no truncation.** `search` truncates to its top 25 because
   ranking makes rank 26 genuinely less interesting; a filter answer has
   no such gradient, and a silently short list would be read as "the
   corpus has no more" — a lie of the kind PRD-003's sixth principle
   rules out. The count line states the size up front.
3. **Both filter vocabularies are closed enums.** `type` is core's
   `DOC_TYPES`; `status` is `DOCUMENT_STATUSES`, every status the
   frontmatter schema accepts across the six types, restated in
   `packages/mcp/src/enumerate.ts` and pinned to core by a colocated
   drift test that derives the same set from `frontmatterSchema`. A typo
   is refused loudly, never answered with an empty list.
4. **`updated_before` is an exclusive YYYY-MM-DD cutoff.** `updated <
   cutoff`, so passing today's date means "not touched today"; ISO dates
   compare correctly as strings, and a malformed date is refused by the
   schema rather than silently matching nothing.
5. **Rows carry a derived `pending` marker.** The gate predicate is
   core's `isPending`, read here rather than re-derived by the consumer
   — the one-evaluation-site principle — so an approval-pass skill can
   see the review queue in the answer it already has.
6. **The queue's head is `nextDispatchable`'s answer, not this
   module's sort.** `get_queue` takes the head from core and prepends
   it to the remaining ready work orders in `compareIds` order, so
   `ready[0]` is by construction the id `veri next` prints even if the
   two orderings ever diverge.
7. **Both schemas are `.strict()`**, like the write tools (WO-118): a
   near-miss key on a read tool silently widens the answer instead of
   dropping content, which is the same defect wearing a quieter face.

## Rejected alternatives

- **JSON payloads, like `run_check`** — unambiguous, but three times
  the tokens per row for a tool whose whole job is bulk enumeration,
  and `run_check` returns a handful of structured findings, not a
  corpus listing. The line form keeps titles unescaped and last.
- **A result cap (search's 25)** — would make "everything of type X"
  unanswerable and turn a partial answer into an apparent complete
  one. Ranking justifies a cap; filtering does not.
- **Free-string `status`/`type` filters** — friendlier to a future
  status, but a typo would return an empty list indistinguishable from
  a genuinely empty result. DEC-058's posture: a filter that cannot
  fire is a defect, not a no-op.
- **Deriving `DOCUMENT_STATUSES` from `frontmatterSchema` at runtime**
  — no drift by construction, but it puts zod-internals traversal
  (`ZodEffects.innerType`, discriminated-union options) on the serving
  path of a tool. The traversal lives in the test instead, where a
  zod upgrade breaks a test rather than the server.
- **Exporting the status vocabulary from core** — the right home if a
  second surface ever needs it, but core has no such constant today
  and WO-127 is an MCP-only work order; adding a core export is a
  wider change than this work claims.
- **An inclusive `updated_before`** — reads as "on or before", which
  makes "stale for N days" arithmetic off by one at the boundary.
- **A `pending: true` filter instead of the row marker** — invents
  grammar the requirement never asked for; `status: draft` plus
  `status: proposed` already enumerate exactly the `isPending` set,
  and the marker keeps the fact visible in the mixed listing too.

## Rationale

Both tools are wayfinding instruments for skills: they are called
early, often, and over the whole corpus, so token cost per row and
honesty about completeness dominate. Every judgment they report —
pending, withdrawn, dispatch head — is core's, which is what keeps the
new surface from becoming a second opinion about the same corpus.
