---
id: WO-008
type: work-order
title: Body schemas in core — templates and checks derived from one definition
status: backlog
created: 2026-08-07
updated: 2026-08-07
links:
  - id: REQ-006
    rel: delivers
  - id: REQ-001
    rel: depends-on
  - id: WO-001
    rel: depends-on
  - id: WO-002
    rel: depends-on
---

## Summary

The rulebook, part one. Add a body schema per document type to
`packages/core` — required/optional sections, order, one line of
guidance each — and make the two existing consumers derive from it:
`veri new` renders its templates from the schema instead of the
hardcoded strings in `packages/cli/src/templates.ts`, and `veri check`
gains a structural check for missing required sections.

The requirement schema gets the shape this project converged on:
**Purpose** (why this exists + who it's for) required, body free-form,
**Acceptance criteria** required with at least one checkbox. Decision
and work-order schemas encode the sections their templates already
have. Backfill a Purpose section into REQ-001–REQ-004 (REQ-005
already has one) so this repo passes its own new check.

## In scope

- Body schema definitions in core for the four existing types
  (structure only; assembly policy is [[WO-009]])
- `veri new` templates rendered from the schemas; delete the
  hardcoded body strings from the CLI
- `veri check`: new issue kind "missing required section
  '<name>'" — heading presence and order only, no prose judgment
- For requirements only, one deeper check: Acceptance criteria must
  contain at least one `- [ ]`/`- [x]` item
- Backfill Purpose sections into REQ-001 through REQ-004
- Tests for schema-derived templates and the new checks

## Out of scope

- Assembly policy / context packaging (that's [[WO-009]])
- User-editable schema files or user-defined document types
- Any new document type
- Validating prose quality, section length, or wording
- UI changes

## Requirements

Delivers the structure half of [[REQ-006]]. Builds on the document
format from [[REQ-001]] and the check machinery from [[REQ-002]].

## Acceptance tests

- [ ] `veri new requirement "X"` produces a body with Purpose and
      Acceptance criteria sections generated from the schema
- [ ] `templates.ts` no longer contains hardcoded body strings
- [ ] `veri check` on a requirement missing its Purpose section
      reports one issue naming the file and the section
- [ ] `veri check` on a requirement whose Acceptance criteria has no
      checkbox items reports an issue
- [ ] `veri check` on this repo reports zero issues (after backfill)
- [ ] All existing tests still pass

## Receipts

(none yet)
