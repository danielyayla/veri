---
id: WO-045
type: work-order
title: "First drift advisories on the advisory chassis"
status: done
created: 2026-08-18
updated: 2026-08-18
links:
  - id: REQ-021
    rel: implements
  - id: SRC-016
    rel: derived-from
  - id: DEC-025
    rel: constrained-by
  - id: WO-026
    rel: depends-on
  - id: WO-044
    rel: related
  - id: SRC-010
    rel: designed-by
---

## Summary

The advisory chassis (WO-025/WO-026, DEC-025) checks structure but not time: nothing notices when the knowledge base drifts out from under its own stamps. This work order adds the first three drift detectors, each computed from files plus git history with no stored state. One: a requirement edited after the work order implementing it was closed — the receipt no longer proves the current text. Two: an active or in-progress work order linking a superseded decision — work standing on revoked authority. Three: an approved document whose content changed after its `approved:` stamp — the stamp no longer covers what the file says. All three surface as advisories through the existing pipeline (CLI, UI advisories panel from WO-026, context packages), so no new UI is required. Advisories whisper; they never block (DEC-025).

## In scope

- Drift detector: requirement (or decision) whose file changed in git after the `done` date/receipt commit of a work order that `implements` it.
- Drift detector: work order with status `in-progress` or `backlog`-promoted-to-active linking a decision whose status is `superseded`.
- Drift detector: document bearing an `approved:` stamp whose body changed in commits after the stamp was applied, excluding guarded-line lifecycle edits made by `veri approve` itself.
- Wiring the three detectors into the existing advisory assembly: `veri check` output and the UI advisories surface carry all three (each host collects its own git facts, DEC-040); context packages gain the advisory tier for the subject work order — pure findings only, since the MCP server is subprocess-free (DEC-037) and packages are byte-identical across CLI and MCP (DEC-038).
- Timestamp derivation from git commit history only — no sidecar metadata, no cached state (derive, don't book-keep).
- Fixture-repo tests for each detector, including the negative cases (an edit before close is not drift; a done work order citing a superseded decision is history, not drift).

## Out of scope

- Any new UI surface or redesign of the advisories panel — presentation reuses WO-026 as-is; changes to it would trigger the design gate (DEC-012).
- Auto-remediation of drift (re-opening work orders, clearing stamps) — advisories inform, humans act.
- Blocking semantics: drift never fails `veri check` (DEC-025).
- Further drift classes beyond the three named (stale links, orphan detection extensions) — file follow-ups if the chassis proves out.
- Receipt-to-commit verification itself — that is WO-044.

## Requirements

- [[SRC-016]] — derived-from
- [[DEC-025]] — constrained-by
- [[WO-026]] — depends-on
- [[WO-044]] — related

## Acceptance tests

- [x] Editing a requirement after its implementing work order is done yields an advisory naming both documents; editing it before close yields nothing.
- [x] An in-progress work order linking a superseded decision yields an advisory; a done work order linking one does not.
- [x] Changing an approved document's body after its stamp yields an advisory; the approve flow's own guarded-line writes do not.
- [x] All three advisories appear in `veri check` output and the UI advisories surface through the existing pipeline with zero new renderer code; context packages carry the advisory tier's pure findings (including superseded-authority drift) for the subject work order, honoring DEC-037 and DEC-038.
- [x] `veri check` exit status is unaffected by drift advisories (DEC-025).
- [x] Detectors run from git history on demand; no new files or caches appear in the knowledge base.
- [x] This repo's own corpus is scanned: each finding is a true drift or the detector is fixed.
- [x] Full suite and `veri check` clean.

## Receipts

- 2026-08-18 — 1d0d6fb — packages/core/src (drift.ts new, drift.test.ts new, provenance.ts, types.ts, check.ts, context.ts, index.ts), packages/cli/src (git.ts, commands.ts, git.test.ts), packages/mcp/src/context.test.ts, packages/ui/src/lib/snapshot.ts(+test), veri/decisions/DEC-041 — three drift detectors shipped per [[DEC-041]] (history-position ordering, lifecycle-subject exclusion, pure-only context packages): superseded-authority drift pure in checkProject, edited-after-done and approved-edited over host-collected GitFacts in check and the desktop snapshot, context packages gain the pure advisory tier for the subject work order; corpus scan surfaced 10 drift findings, each verified true; 335 tests pass, veri check 0 issues (agent session, Claude Code)
- 2026-08-18 — 395a285 — packages/core/src (drift.ts, approve.ts, +tests), packages/cli/src/commands.test.ts, veri/decisions/DEC-041 — drift's named remedy made real: a re-approval newer than the offending edit resolves edited-after-done (same anchor rule as [[DEC-041]]'s stamp detector), and veri approve re-stamps already-promoted documents in place; DEC-041's rejected-alternatives section restored after the MCP writeback dropped it; 337 tests pass (agent session, Claude Code)
