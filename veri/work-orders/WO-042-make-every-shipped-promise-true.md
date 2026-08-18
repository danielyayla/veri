---
id: WO-042
type: work-order
title: Make every shipped promise true
status: in-progress
created: 2026-08-18
updated: 2026-08-18
links:
  - id: REQ-019
    rel: implements
  - id: SRC-016
    rel: designed-by
---

## Summary

Four instances of promise/reality drift and one self-hosting leak:
scaffolded AGENTS.md instructs `veri context <WO-id>` which does not
exist; README, the `get_context` description, and the PACKAGE RULES
footer still claim packages include CLAUDE.md (removed by DEC-018); the
UI package calls itself "five screens"; and `checkDesignGate` hardcodes
the literal `packages/ui` in shared core, shipping this repo's directory
layout to every user's project. Fix each drift at the source and add the
test that keeps the set empty.

## In scope

- `veri context <WO-id>`: implement it in the CLI (printing the same
  package `get_context` serves), or strip every mention from scaffolded
  and shipped text — one or the other, nothing in between.
- Reconciling every description of package contents (README, tool
  description, PACKAGE RULES footer) with what `assembleContext`
  actually emits.
- Correcting the UI package's stale self-description.
- Replacing the hardcoded `packages/ui` trigger with a project-defined
  one (workflow, template, or config-as-document — the mechanism is a
  decision to file when the work starts), so core carries nothing
  specific to the Veri repo.
- A drift test: scaffolded text and tool descriptions are exercised
  against the build, failing when they name a command or content that
  does not exist.

## Out of scope

- New package features or assembly changes ([[WO-041]]).
- Renaming or redesigning the design gate itself — DEC-012 stands; only
  its trigger plumbing moves out of core.

## Requirements

Implements [[REQ-019]] — the product that shows the exact write before
it happens must not document commands that don't exist.

## Acceptance tests

- [ ] `veri context` exists, or no scaffolded or shipped text mentions
      it — verified by test, not by grep discipline.
- [ ] Every description of package contents matches `assembleContext`
      output.
- [ ] Core contains no Veri-repo-specific path or heuristic; the design
      gate triggers identically in any project via project-defined
      configuration.
- [ ] The drift test fails when a scaffolded or described capability is
      removed from the build.
- [ ] Full suite and `veri check` clean, including in a freshly
      scaffolded project.

## Receipts

(none yet)
