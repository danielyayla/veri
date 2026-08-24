---
id: WO-088
type: work-order
title: "Code bindings on work orders and spec-to-code drift detectors"
status: in-progress
created: 2026-08-24
updated: 2026-08-24
links:
  - id: REQ-021
    rel: extends
  - id: REQ-025
    rel: related
  - id: DEC-025
    rel: constrained-by
  - id: DEC-040
    rel: constrained-by
  - id: SRC-043
    rel: derived-from
---

## Summary

Give work orders an optional machine-readable binding to the code they claim — path globs and named tests — and extend the drift engine with detectors over those bindings: a changed file no active work order claims, an in-progress work order whose bound paths have gone quiet, and a bound test name that no longer exists. This closes the load-bearing gap identified in SRC-043: today `veri check` proves the knowledge base is internally consistent, but a source change no work order claims is invisible. Bindings make spec-to-code drift computable deterministically — globs and git facts, no semantics — extending REQ-021's mechanical-not-social principle from documents to code.

## In scope

- An optional `binds:` frontmatter block on work orders (`paths:` list of repo-root-relative globs, `tests:` list of test identifiers), validated in core's schema; absence is legal and changes nothing for existing work orders
- Detector: unclaimed code change — a commit touching files outside `veri/` that match no in-progress work order's `binds.paths`, scoped to a diff range (since last check anchor or a host-supplied range), surfaced through the advisory tier per DEC-025
- Detector: stale in-progress work order — `in-progress` with bindings but no commits touching its bound paths within N days (N configurable, sensible default), advisory
- Detector: bound test names that no longer resolve to existing tests, with existence facts collected by the host and passed into pure core, following the DEC-040 pattern (core never touches the filesystem or git itself)
- All detectors pure over documents plus host-collected facts, derived on demand, no stored state; outside a git repository they degrade to a skip with a note, matching REQ-021's acceptance bar
- CLI surface: findings appear in `veri check` output alongside existing drift advisories; degrade gracefully for work orders without bindings
- Format documentation: the `binds:` block added to the knowledge-base format doc (DEC-030 ground) and templates updated so new work orders show the field commented or empty
- Self-hosting proof: at least one of this repo's own in-progress work orders carries bindings and the detectors run green in `veri check`

## Out of scope

- Semantic or LLM-based drift scoring of any kind — SRC-043 records the source spec's own warning against it, and DEC-025's advisory posture stays
- Blocking severity for the new detectors — everything lands as advisory; escalation to failure remains the REQ-025 opt-in, and any per-rule severity configuration is a separate future work order
- Exposing these findings over MCP (the run_check work order filed alongside this one)
- A `veri trace <path>` command walking bindings to answer "why does this code exist" — downstream of this work, its own work order once bindings exist
- A `veri bind` convenience command for editing bindings without hand-editing YAML — ergonomics for later
- Renaming or restructuring the existing prose "In scope" sections of work orders; `binds` complements them, never replaces them

## Requirements

- [[REQ-021]] — extends
- [[REQ-025]] — related
- [[DEC-025]] — constrained-by
- [[DEC-040]] — constrained-by
- [[SRC-043]] — derived-from

## Acceptance tests

- [ ] A work order may declare `binds.paths` and `binds.tests`; the schema validates shape, and a work order without the block passes every check unchanged
- [ ] A commit touching a source file that matches no in-progress work order's bound paths surfaces an unclaimed-code-change advisory naming the file and commit
- [ ] A commit touching a file matched by an in-progress work order's bound paths produces no unclaimed-change advisory
- [ ] An in-progress work order with bindings and no commits on its bound paths within the staleness window surfaces a stale advisory naming the work order and the window
- [ ] A bound test identifier that no longer exists surfaces an advisory; existence facts come from the host, and core stays free of filesystem and git access
- [ ] All new findings flow through the existing advisory pipeline and never change `veri check`'s exit status
- [ ] Outside a git repository, every new detector degrades to a skip with a note — never a failure or a false verdict
- [ ] The format documentation and work-order template document the `binds:` block
- [ ] This repository's own `veri check` runs green with at least one binding-carrying work order in the corpus

## Receipts

(none yet)
