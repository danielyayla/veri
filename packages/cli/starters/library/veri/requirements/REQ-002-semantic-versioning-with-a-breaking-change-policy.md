---
id: REQ-002
type: requirement
title: Semantic versioning with a breaking-change policy
status: draft
created: 0001-01-01
updated: 0001-01-01
---

Consumers can upgrade with confidence because version numbers carry
meaning: patch releases fix, minor releases add, and nothing breaks
outside a major release. Breaking changes are planned events with a
migration story, never surprises in a changelog.

## Acceptance criteria

- [ ] Releases follow semantic versioning against the documented
      public surface ([[REQ-001]])
- [ ] Every release ships a changelog entry written for consumers:
      what changed, and what (if anything) they must do
- [ ] A breaking change ships with a migration note and, where
      feasible, a deprecation period in which the old and new ways
      both work
- [ ] Deprecations are announced in one release before removal in a
      major
