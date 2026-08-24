---
id: REQ-001
type: requirement
title: A deliberate, documented public API surface
status: draft
created: 0001-01-01
updated: 0001-01-01
---

The library's public surface is a choice, not an accident of what
happened to be exported. Everything reachable by a consumer is
documented and intended; everything internal is unreachable, not
merely undocumented.

## Acceptance criteria

- [ ] Every public export has documentation: what it does, its
      parameters, its failure modes
- [ ] Internal helpers are not importable by consumers (enforced by
      the packaging, not by a comment)
- [ ] A change that adds a public export is reviewed as an API
      decision, because removing it later is a breaking change
- [ ] The documented surface and the shipped surface are checked
      against each other — a new export cannot ship undocumented
