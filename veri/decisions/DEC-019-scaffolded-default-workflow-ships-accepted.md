---
id: DEC-019
type: decision
title: The scaffolded default workflow ships accepted, not draft
status: proposed
created: 2026-08-12
updated: 2026-08-12
links:
  - id: WO-021
    rel: constrains
  - id: DEC-018
    rel: follows-from
  - id: REQ-008
    rel: informed-by
---

## Choice

`scaffoldProject` writes the default `veri/workflow.md` with
`status: accepted` and an `approved:` stamp set to the scaffold date.
Workflows written any other way (`veri new workflow`, agent writeback)
are born `draft` like every other document and need `veri approve`.

## Rejected alternatives

- **Born `draft`, like agent-authored documents** — the strict reading
  of [[REQ-008]], but REQ-008 gates *agent* authorship, and running
  `veri init` is the user's own deliberate act, exactly like
  `veri approve`. A draft default would make every new project's
  context package open with "not ratified, do not treat as binding" —
  an opinionated default that disclaims itself defeats the fast
  onboarding it exists for, and demands a ritual approval of text the
  user hasn't changed.
- **A third, stampless "built-in" status** — avoids a synthetic
  approval date but adds a status to the vocabulary for one file, and
  the stamp is truthful as-is: it records when the user installed it.

## Rationale

The demo sets the precedent: scaffolded canon ships approved (its
requirements and decisions carry stamps). The approval gate exists to
keep AI-authored text from silently binding; Veri-shipped defaults
installed by a human command are the user's choice, and editing or
replacing the file afterwards re-enters the normal draft → approve
cycle.
