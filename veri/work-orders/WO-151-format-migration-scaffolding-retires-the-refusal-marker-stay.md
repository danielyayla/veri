---
id: WO-151
type: work-order
title: "Format-migration scaffolding retires; the refusal marker stays"
status: backlog
created: 2026-09-01
updated: 2026-09-01
links:
  - id: REQ-015
    rel: narrows
  - id: SRC-066
    rel: derived-from
# binds:         # code this work order claims (optional)
#   paths: []    # repo-root-relative globs
#   tests: []    # test files proving it (path or path::name)
---

## Summary

All four shipped migrations are marker-only writes — veri migrate on a format-0 project only ever writes "4". SRC-066's read: REQ-015's core protection is the refuse-if-newer/invalid classification, which stays untouched everywhere; the step-walking MIGRATIONS scaffolding is machinery for content rewrites that have never once existed. Collapse veri migrate to a single stamp-current write and delete the step table. If WO-143's status change lands later and needs a real content migration, it builds the one it needs — machinery is cheap to write when a real migration finally exists, and free to not maintain until then. SEQUENCING: waits for WO-125 (the format-4 release) to ship first.

## In scope

- Collapse the MIGRATIONS step table: veri migrate classifies, then writes the current marker in one step for older/pre-marker projects
- Refuse-if-newer and refuse-if-invalid unchanged in every surface (CLI, MCP guardFormat, app, action)
- Docs: what migrate does and when a future format bump would carry a real migration

## Out of scope

- Removing the veri/format marker or its classification (REQ-015's core)
- Any format-5 work (WO-143 owns its own bump if its decision is stamped)
- Changing what the app does on format mismatch

## Requirements

- [[REQ-015]] — narrows
- [[SRC-066]] — derived-from

## Acceptance tests

- [ ] veri migrate on pre-marker, format-1, -2, and -3 fixtures writes the current marker in one step and nothing else
- [ ] newer and invalid markers still refuse on CLI, MCP, and action (existing e2e stays green)
- [ ] The MIGRATIONS step table and its per-step tests are gone
- [ ] Full suite green

## Receipts

(none yet)
