---
id: WF-001
type: workflow
title: CLI tool project workflow
status: draft
created: 0001-01-01
updated: 0001-01-01
---

How work moves through this command-line tool project. This document is
delivered as the first section of every context package, so every human
and every agent works from the same rules. It was seeded by a starter
bundle: edit it until it describes how this project actually works,
then approve it (`veri approve WF-001`) — or replace it entirely.

## The path of work

1. **Sources** (`veri/sources/`) hold evidence: user feedback, issue
   reports, transcripts of real terminal sessions. Sources inform;
   they never bind.
2. **Requirements** (`veri/requirements/`) state what must be true for
   the people scripting and running the tool, with acceptance
   criteria. **Decisions** (`veri/decisions/`) record technical
   choices with the alternatives that were rejected, so settled ground
   stays settled.
3. **Work orders** (`veri/work-orders/`) scope one unit of
   implementation: goal, in scope, out of scope, acceptance criteria,
   receipts. Every work order links at least one requirement.
4. **Implementation** happens only against a work order, inside its
   scope, respecting every linked document.

## Rules for implementers

1. Never start coding from a chat prompt alone. Find the relevant work
   order; if none exists, say so and propose one.
2. Read every document a work order links to in full before
   implementing. If you believe a linked decision is wrong, stop and
   say so instead of silently deviating.
3. Stay inside the work order's "In scope" section. Anything under
   "Out of scope" is forbidden, even when it seems easy or obvious.
4. File non-trivial technical choices as new decisions with the
   rejected alternatives, using the next free DEC id.
5. Documents are born unapproved (`draft` / `proposed`). Promotion is
   the project owner's act alone, recorded as an `approved:` stamp
   (`veri approve <id>`). Never promote a document yourself.
6. When you finish a work session, append a receipt to the work order
   under `## Receipts`: date, commit, files touched, one-line summary.
7. Run `veri check` before declaring any work complete. Zero issues is
   the bar.

## Conventions for this project

- Every command's exit code and stdout/stderr split is part of its
  contract ([[REQ-001]]) — a change to either is a breaking change.
- New flags ship with `--help` text and an error message that names
  the fix when misused ([[REQ-002]]).
- Behavior differences between flags, environment variables, and
  config files follow the documented precedence ([[REQ-003]]); tests
  cover the non-interactive path ([[REQ-004]]).
