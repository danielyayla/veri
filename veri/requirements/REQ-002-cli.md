---
id: REQ-002
type: requirement
title: CLI for project lifecycle and health
status: accepted
created: 2026-08-06
updated: 2026-08-06
links:
  - id: REQ-001
    rel: depends-on
---

A `veri` command-line tool covers the daily loop without any other
interface: initialize a project, create documents with correct IDs, and
verify knowledge-base health.

## Acceptance criteria

- [ ] `veri init` scaffolds the `veri/` directory; `veri init --demo`
      additionally installs the bundled demo project
- [ ] `veri new <type> "<title>"` creates a document with the next free ID,
      correct frontmatter, and a type-appropriate body template
- [ ] `veri check` reports: broken links (target ID does not exist),
      invalid frontmatter, duplicate IDs, work orders with no linked
      requirement, and work orders marked done with unchecked criteria or
      zero receipts
- [ ] `veri check` exits non-zero on any issue (CI-usable) and lists each
      issue as file + one-line message
- [ ] `veri list [type]` prints ID, status, and title, sorted by ID
