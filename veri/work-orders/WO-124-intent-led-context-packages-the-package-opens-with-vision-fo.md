---
id: WO-124
type: work-order
title: "Intent-led context packages: the package opens with vision, focus, and the bet"
status: backlog
created: 2026-08-27
updated: 2026-08-27
links:
  - id: REQ-039
    rel: implements
  - id: WO-121
    rel: depends-on
  - id: SRC-056
    rel: derived-from
# binds:         # code this work order claims (optional)
#   paths: []    # repo-root-relative globs
#   tests: []    # test files proving it (path or path::name)
---

## Summary

Context assembly (`veri context` / `get_context`) opens with an intent section — the approved product singletons (vision and current-focus at minimum) — ahead of requirements and decisions, and when the work order implements a hypothesis requirement, states the bet: the metric and target that would confirm or refute it. Depends on WO-121 landing the product singletons.

## In scope

- Core assembly: an intent section first in the package — approved product singletons (excerpt policy is a DEC), then workflow (DEC-018 preserved), then requirements/decisions as today
- Hypothesis surfacing: when the WO's requirement chain reaches a `kind: hypothesis` requirement, the package states the bet (metric, target) explicitly
- Draft-status singletons are excluded (only approved intent steers agents)
- CLI and MCP both serve the new assembly; snapshot/package tests updated

## Out of scope

- The trace check (WO-123)
- Authoring or revising the product singletons' content (WO-121 seeds; the user owns content)
- UI package-panel rendering of the intent section (design-gated)

## Requirements

- [[REQ-039]] — implements
- [[WO-121]] — depends-on
- [[SRC-056]] — derived-from

## Acceptance tests

- [ ] A context package for any WO opens with the intent section before workflow and REQ/DEC content
- [ ] A WO implementing a hypothesis requirement gets the bet stated with metric and target
- [ ] Draft singletons never appear in packages
- [ ] Zero `veri check` violations repo-wide

## Receipts

(none yet)
