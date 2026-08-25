---
id: DEC-094
type: decision
title: "Originals live in veri/originals, id-keyed, referenced by an original frontmatter field the loader never parses"
status: proposed
created: 2026-08-25
updated: 2026-08-25
links:
  - id: WO-094
    rel: constrains
  - id: REQ-031
    rel: satisfies
  - id: DEC-023
    rel: follows-from
  - id: DEC-002
    rel: follows-from
---

## Choice

The unmodified evidence file is copied to veri/originals/<SRC-id>-<sanitized-filename> — inside the knowledge base so it travels with the corpus, id-keyed so names never collide. The source document references it through a new optional, schema-validated `original:` frontmatter field holding the veri/-relative path. loadProject skips originals/ entirely (the DEC-023 templates/ precedent), so a preserved .md original can never parse as a knowledge-base document. Both writes are wx (never overwrite), ordered original-then-document so a partial failure leaves at worst an unreferenced original, never a dangling reference. The loader skip is the [[DEC-023]] templates/ precedent; keeping everything inside veri/ is the [[DEC-002]] files-are-the-source-of-truth posture.

## Rejected alternatives

- **Originals outside the knowledge base (a repo-root originals/ or an OS data dir)** — the corpus stops being self-contained: cloning, moving, or backing up veri/ would silently shed the evidence the sources cite, and [[DEC-002]] says the files ARE the database.
- **A body link instead of a frontmatter field** — invisible to the schema and to surfaces that render metadata; the desktop design (SRC-045) renders `original` as a frontmatter property row, and an unvalidated body path is a silently dead pointer the day a file moves.
- **Original filename kept verbatim (no id prefix)** — two imports of files with the same name collide; the id prefix makes every original's provenance readable from `ls` alone.
- **Embedding the original as a fenced block in the document body** — destroys byte fidelity for anything non-trivial, bloats context packages, and caps what can ever be preserved at what markdown can hold.

## Rationale

Preservation is only worth having if the evidence survives every operation the knowledge base survives and can never masquerade as knowledge. In-tree storage gives the first; the loader skip and the validated reference give the second. The wx-ordered writes make the failure mode boring: nothing ever points at a file that is not there.
