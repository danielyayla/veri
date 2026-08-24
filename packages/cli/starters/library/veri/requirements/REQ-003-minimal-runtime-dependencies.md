---
id: REQ-003
type: requirement
title: Minimal runtime dependencies
status: draft
created: 0001-01-01
updated: 0001-01-01
---

Every runtime dependency this library takes is inherited by every
project that uses it: its bugs, its security advisories, its install
weight, its supply-chain risk. Dependencies are taken deliberately and
rarely, and each one has a written justification.

## Acceptance criteria

- [ ] Adding a runtime dependency requires a decision document naming
      the alternatives (vendoring, implementing the slice needed, not
      taking the feature)
- [ ] Development-only tooling is isolated so it never rides into
      consumers' installs
- [ ] The dependency list is reviewed at every major release: anything
      no longer earning its place is dropped
