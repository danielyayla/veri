---
id: REQ-001
type: requirement
title: Linked markdown document format
status: accepted
approved: 2026-08-10
created: 2026-08-06
updated: 2026-08-06
links:
  - id: DEC-002
    rel: constrained-by
---

Veri projects are a `veri/` directory containing four subdirectories —
`requirements/`, `decisions/`, `work-orders/`, `sources/` — of markdown
files with YAML frontmatter. Documents reference each other by stable ID
via frontmatter `links` and inline `[[ID]]` syntax. The format must be
fully usable with no Veri tooling installed: readable and editable in any
text editor, diffable in git, renderable on GitHub.

## Acceptance criteria

- [ ] Frontmatter schema validated: id, type, title, status, created,
      updated, links (id + rel); unknown extra keys are preserved, not
      rejected
- [ ] IDs are immutable and unique across the project; filenames may
      change freely without breaking links
- [ ] Inline `[[ID]]` references are parsed and resolved identically to
      frontmatter links
- [ ] A document with invalid frontmatter produces one clear error naming
      the file, the field, and the problem
- [ ] Per-type status vocabularies enforced (see CLAUDE.md)
