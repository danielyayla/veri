---
id: WO-136
type: work-order
title: "Shell drift advisories — the host-fed tier learns to compare emitted shells against their methods"
status: backlog
created: 2026-08-27
updated: 2026-08-27
links:
  - id: DEC-129
    rel: implements
  - id: DEC-130
    rel: constrained-by
  - id: REQ-040
    rel: implements
  - id: DEC-040
    rel: constrained-by
  - id: WO-135
    rel: depends-on
# binds:         # code this work order claims (optional)
#   paths: []    # repo-root-relative globs
#   tests: []    # test files proving it (path or path::name)
---

## Summary

The method–canon consistency half of [[DEC-129]]'s pre-ship bar, in the tier [[DEC-130]] assigned it to.

Shells live in `.claude/skills/`, outside `veri/`. `checkProject(load)` is pure over `veri/` and must stay that way, so the host collects the emitted shells the way the CLI already collects git facts for the provenance advisories ([[DEC-040]]) and hands core a pure comparator. Same two-tier shape that already exists: core-pure rules in `checkProject`, host-fed rules one layer up in `packages/cli/src/commands.ts`.

Advisory severity, deliberately. A stale shell is a stale pointer, not a broken knowledge base, and the repair is one command. Making it an issue would fail `veri check` on a working project because someone edited a description — and would, worse, block `veri approve`, which refuses on issues but not on advisories.

## In scope

- A pure comparator in core taking collected shell facts plus the loaded documents, returning advisories — no filesystem access, no knowledge of which harness produced the facts
- The CLI-side collector that reads the harness directory and feeds it, on the `collectGitFacts` pattern
- Rule one: a shell whose content differs from what its method would emit now — the description was edited, or the method was amended after install
- Rule two: a shell whose method is missing, `retired`, or `withdrawn` — an orphaned trigger pointing at coaching that is out of play
- Every advisory names its repair command, on the pattern the existing advisories follow
- Silence when the harness directory does not exist. A project that never installed shells has no drift, and must not be nagged about it

## Out of scope

- Any check running inside the MCP server. `run_check` already reports a `skipped` tier for host-fed checks it cannot run subprocess-free; this joins that tier and is reported as skipped there, not reimplemented
- Making either rule an issue rather than an advisory
- Auto-repair. Detection reports; `veri skills upgrade` fixes
- The trigger-corpus half of [[DEC-129]]'s bar — that needs a runner and is its own work order
- Validating `requires:` against a live MCP tool list. Core cannot know the MCP surface without inverting the dependency direction ([[DEC-130]]); the server validates its own tool names

## Requirements

- [[DEC-129]] — implements
- [[DEC-130]] — constrained-by
- [[REQ-040]] — implements
- [[DEC-040]] — constrained-by
- [[WO-135]] — depends-on

## Acceptance tests

- [ ] An emitted shell edited by hand raises the drift advisory naming the method and the repair command
- [ ] A method amended after its shell was written raises the same advisory — drift is detected from either side
- [ ] Retiring a method whose shell is still on disk raises the orphaned-trigger advisory
- [ ] A project with no harness directory raises neither advisory
- [ ] Both are advisories: `veri check` exits 0 with drift present, and `veri approve` still succeeds on an otherwise clean document
- [ ] The core comparator is unit-tested against fabricated shell facts with no filesystem access, proving the purity boundary holds
- [ ] `run_check` over MCP lists both rules under `skipped` with a reason, rather than reporting a false pass

## Receipts

(none yet)
