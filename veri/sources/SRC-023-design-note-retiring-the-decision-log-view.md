---
id: SRC-023
type: source
title: Design note — Retiring the Decision log view
status: imported
created: 2026-08-18
updated: 2026-08-18
links:
  - id: REQ-004
    rel: designs
  - id: SRC-014
    rel: builds-on
  - id: SRC-016
    rel: derived-from
  - id: DEC-012
    rel: constrained-by
---

> Drafted 2026-08-18 by an agent session (Claude Code) for the
> Decision log resolution work order, per the DEC-012 design gate,
> under Daniel's P1 implementation directive of 2026-08-18. Pending
> Daniel's review. A removal note in the [[SRC-011]] register: the
> design *is* the removal, and this records why and what carries each
> capability afterward.

[[SRC-016]] asked that the Decision log be **resolved** — given a
place in navigation or retired. The evidence for retiring it: it is
"reachable only via ⌘K … existing in no navigation at all", one of
"three redundant lenses" alongside Board and Graph, and on the
remove-50% list. [[SRC-014]]'s labeled sidebar gave every type a
panel; the Decisions panel is the log's successor with a sidebar seat.

## Resolution: retire the view

Remove the `decisions` view (screen 5 of [[REQ-004]]) — the ViewKey,
the palette's view row, and `views/decisions.ts`. Every capability the
log carried maps to a surviving surface:

- **Chronological feed** → the Decisions type panel orders by
  `created`, newest first — the log's ordering, in the panel that has
  a sidebar seat.
- **Superseded dimmed, with the ↪ pointer** → the panel rows keep
  status chips; the superseded pointer lives where it always
  resolved — the document's frontmatter card and Connections panel.
- **Choice + rejected-alternatives summary** → the document itself,
  one click away; hover previews (this P1 batch) put the excerpt on
  the chip.
- **⌘K "Decisions" row** → `type:decision` and the Decisions sidebar
  entry, both existing.

Workspace files that persist a `decisions` view tab restore cleanly:
tab restore already drops entries whose target no longer resolves —
verify with a test, never a migration.

[[REQ-004]] is amended in the same change to describe four screens;
the post-stamp edit surfaces as a WO-045 drift advisory until Daniel
re-approves — the intended path for evolving an accepted requirement,
not a violation. The retirement itself is filed as a proposed decision
for Daniel's stamp; Board and Graph are explicitly out of scope here
(P2 territory, separate evidence).
