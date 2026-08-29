---
id: WO-139
type: work-order
title: "The format-bump obligation is written down, and the refusal names restart"
status: backlog
created: 2026-08-29
updated: 2026-08-29
links:
  - id: DEC-139
    rel: implements
  - id: REQ-015
    rel: implements
  - id: SRC-064
    rel: derived-from
binds:
  paths:
    - packages/core/src/format.ts
    - RELEASING.md
  tests:
    - packages/core/src/format.test.ts
---

## Summary

[[DEC-139]] is active: a `CURRENT_FORMAT` bump is a breaking change for
every reader *already running*, not only every reader already
installed. [[SRC-064]] recorded the cost — the format-4 bump closed the
whole MCP surface to a session mid-conversation, and the one sentence
that session saw named the repair that did not apply to it. This work
order lands the two consequences DEC-139 sanctioned, and nothing else.

## In scope

- `RELEASING.md`: retitle `## Before any release: the format-bump
  check` to `## Before any format bump`, demote the existing release
  obligation to one item under it, and add the second item — the bump
  takes effect for running readers the instant the marker changes, so
  every live MCP session must reconnect and every long-running host
  process must restart; a work order that bumps `CURRENT_FORMAT`
  carries that restart as an acceptance criterion beside its migration
  step
- `packages/core/src/format.ts`: `formatStatement`'s `newer` case ends
  by naming both repairs — update Veri, and restart the reader —
  unconditionally, without trying to determine which applies
- Cover the new sentence in `format.test.ts`

## Out of scope

- Any change to `guardFormat()` or `classifyFormat()` — DEC-139
  sanctioned no detection, no handshake, and no new check rule
- A `CURRENT_FORMAT` bump of its own; this work order describes the
  obligation, it does not incur one
- The format-4 release itself ([[WO-125]])

## Requirements

Implements [[DEC-139]] and delivers [[REQ-015]] — a newer-format
project states what is wrong *and what clears it*, which for a running
reader is a restart. Derived from [[SRC-064]].

## Acceptance tests

- [ ] `RELEASING.md` has a `## Before any format bump` heading whose
      items cover both the release obligation and the restart
      obligation
- [ ] `formatStatement` on a `newer` classification returns a sentence
      naming both updating Veri and restarting the reader
- [ ] A test asserts that sentence; `npm test -w @verikb/core` passes
- [ ] `veri check` reports zero issues

## Receipts

(none yet)
