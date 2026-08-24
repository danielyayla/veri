---
id: REQ-024
type: requirement
title: "Brownfield import of an existing project"
status: accepted
approved: 2026-08-24
created: 2026-08-24
updated: 2026-08-24
links:
  - id: REQ-008
    rel: constrained-by
  - id: REQ-013
    rel: extends
  - id: REQ-003
    rel: depends-on
  - id: DEC-002
    rel: constrained-by
---

A person adopting Veri on a project that already exists — code,
history, conventions, maybe ADRs — reaches a reviewable knowledge
base without hand-authoring it from a blank directory. Today the
on-ramp assumes greenfield: `veri init` produces an empty tree, and
the cost of writing the initial corpus by hand is the main barrier
to adopting Veri on the projects people actually have.

- **Import is a guided flow, not a convention.** From the CLI and
  from the desktop app's new/open-project path, a project without a
  populated `veri/` directory offers an import path that walks the
  user from empty tree to reviewable corpus.
- **The user's agent does the reading.** Veri hands the connected
  agent an instruction package over MCP describing what to mine —
  code layout, git history, existing ADRs, READMEs, agent-facing
  docs like CLAUDE.md/AGENTS.md — and how to file what it finds.
  Veri itself makes no LLM or network calls ([[DEC-002]]).
- **Everything imported lands non-binding.** Mined requirements
  arrive as `status: draft`, mined decisions as `status: proposed`,
  per the approval workflow ([[REQ-008]]). Promotion remains the
  user's act alone; there is no bulk stamping.
- **Provenance is mandatory.** Every imported requirement and
  decision links to SRC documents naming what it was derived from
  (file paths, commit refs, existing ADR files), so the user can
  judge each claim against its evidence during review.
- **Review is a designed surface.** Imported documents are visibly
  grouped as import output awaiting approval — in the app and via
  `veri check` — so the user can work through them deliberately
  rather than discovering strays later.

Out of scope for this requirement: importing from external
trackers (Jira, Linear, GitHub Issues) and format-level migration
of other ADR tools beyond reading plain markdown as sources.

## Acceptance criteria

- [ ] On a repo with no populated `veri/` directory, both the CLI
      and the app offer the import flow without the user consulting
      external docs
- [ ] The import instruction package is served over MCP and names
      the sources to mine and the filing rules
- [ ] An imported corpus contains only draft requirements, proposed
      decisions, and imported sources — nothing binding
- [ ] Every imported requirement and decision carries provenance
      links to at least one SRC document
- [ ] `veri check` passes on a freshly imported tree and still
      blocks work orders that link unapproved imported documents
- [ ] The website documents the brownfield path from install to
      first stamped approval
