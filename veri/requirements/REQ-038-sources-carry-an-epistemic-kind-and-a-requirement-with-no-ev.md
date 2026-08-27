---
id: REQ-038
type: requirement
title: "Sources carry an epistemic kind, and a requirement with no evidence is a visible intuition-only bet"
status: draft
created: 2026-08-27
updated: 2026-08-27
links:
  - id: SRC-056
    rel: derived-from
  - id: REQ-032
    rel: builds-on
  - id: REQ-033
    rel: builds-on
---

Sources become first-class evidence rather than undifferentiated storage. Two changes, mirroring what [[REQ-032]] did for requirements:

1. **Source kind.** Every source carries a `kind` field naming its evidence class — at minimum: `design`, `user-feedback`, `metric`, `external-eval`, `investigation`, `outcome`. The default for the absent field is chosen so the existing 50+ sources (predominantly design notes) need no migration. Kinds let the UI, checks, and context assembly treat a usability finding differently from a design artifact, and make the evidence/design ratio visible instead of letting evidence drown.

2. **The intuition-only advisory.** A non-withdrawn requirement with no `derived-from` link to any source is an **intuition-only bet**: `veri check` surfaces it as an advisory — never an error, because intuition is a legitimate origin — until evidence lands or the requirement is retired. This is the front-side mirror of the existing untested-bet advisory ([[REQ-033]]): together they bracket a requirement's life with "where did this come from?" and "did it work?"

Evidence never auto-promotes anything: interpreting a source into a requirement remains the user's act, consistent with the gates in [[WF-001]].

## Acceptance criteria

- [ ] Sources accept a `kind` field with a defined vocabulary and a migration-free default for existing sources
- [ ] `veri check` reports a requirement lacking any `derived-from` source link as an intuition-only advisory (never a violation)
- [ ] The advisory clears when a source link lands or the requirement is withdrawn/retired
- [ ] Source kind is visible wherever sources are listed (CLI, app, context package)
