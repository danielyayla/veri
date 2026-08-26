---
id: WO-112
type: work-order
title: "The design gate reads intent, not mentions — an out-of-scope path must not trip it"
status: backlog
created: 2026-08-26
updated: 2026-08-26
links:
  - id: DEC-039
    rel: implements
  - id: WO-109
    rel: relates-to
  - id: DEC-012
    rel: relates-to
# binds:         # code this work order claims (optional)
#   paths: []    # repo-root-relative globs
#   tests: []    # test files proving it (path or path::name)
---

## Summary

Approving WO-109 raised a design-gate violation for a path that work order explicitly promises not to touch: its only mention of the app package sits in `## Out of scope`. The gate matches any body-text occurrence of a `design_gate_paths` entry ([[DEC-039]], packages/core/src/check.ts:243, documented as the v1 heuristic), so a sentence naming what the work will *not* touch is indistinguishable from one claiming it will. The failure mode punishes precision — the more carefully a work order draws its boundary, the more likely it trips — and the workaround is to describe gated paths in prose that avoids their literal spelling, which is worse for both readers and the gate. Deliver: the gate ignores mentions inside the `## Out of scope` section, so exclusions never trigger it, while any mention in Summary, In scope, or elsewhere still does.

## In scope

- `checkDesignGate` in packages/core/src/check.ts scoped to exclude the `## Out of scope` section when searching for gated paths; every other section still triggers as today
- Section slicing shared with the existing body-section parsing rather than a second ad-hoc scanner, if one already exists in core
- The issue message unchanged in shape; no new issue kind
- The v1-heuristic comment above `checkDesignGate` updated to state the exclusion and what remains a mention-based match
- Colocated `*.test.ts` coverage: a gated path mentioned only in Out of scope raises nothing; the same path in Summary or In scope still raises; a work order mentioning it in both still raises; a work order with a valid `designed-by` link raises nothing either way
- Restoring WO-109's out-of-scope line to name the path literally once the gate no longer misreads it

## Out of scope

- Replacing the body-text heuristic with git diffs or declared file lists — a larger design question, and the accuracy win here does not depend on it
- Changing which paths are gated, or the `design_gate_paths` frontmatter shape ([[DEC-039]])
- Applying the same section-scoping to other body-text checks without evidence they misfire the same way
- Any change to what satisfies the gate (a `designed-by` link to an existing document)
- Retroactively auditing closed work orders for gate false positives

## Requirements

- [[DEC-039]] — implements
- [[WO-109]] — relates-to
- [[DEC-012]] — relates-to

## Acceptance tests

- [ ] A ready work order whose only gated-path mention is inside `## Out of scope` raises no design-gate issue
- [ ] The same path in `## Summary` or `## In scope` still raises the issue
- [ ] A work order mentioning the path in both Out of scope and In scope still raises the issue
- [ ] A work order with a `designed-by` link to an existing document raises nothing regardless of where the path is mentioned
- [ ] A work order with a `designed-by` link whose target id does not exist still fails the gate, as today
- [ ] With no `design_gate_paths` declared, the gate stays inert
- [ ] WO-109's out-of-scope line names the path literally again and `veri check` reports zero violations

## Receipts

(none yet)
