---
id: WO-045
type: work-order
title: "First drift advisories on the advisory chassis"
status: backlog
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
---

## Summary

The advisory chassis (WO-025/WO-026, DEC-025) checks structure but not time: nothing notices when the knowledge base drifts out from under its own stamps. This work order adds the first three drift detectors, each computed from files plus git history with no stored state. One: a requirement edited after the work order implementing it was closed — the receipt no longer proves the current text. Two: an active or in-progress work order linking a superseded decision — work standing on revoked authority. Three: an approved document whose content changed after its `approved:` stamp — the stamp no longer covers what the file says. All three surface as advisories through the existing pipeline (CLI, UI advisories panel from WO-026, context packages), so no new UI is required. Advisories whisper; they never block (DEC-025).

## In scope

- Drift detector: requirement (or decision) whose file changed in git after the `done` date/receipt commit of a work order that `implements` it.
- Drift detector: work order with status `in-progress` or `backlog`-promoted-to-active linking a decision whose status is `superseded`.
- Drift detector: document bearing an `approved:` stamp whose body changed in commits after the stamp was applied, excluding guarded-line lifecycle edits made by `veri approve` itself.
- Wiring the three detectors into the existing advisory assembly so they appear wherever advisories already appear: `veri check` output, the UI advisories surface, and context packages.
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

- [ ] Editing a requirement after its implementing work order is done yields an advisory naming both documents; editing it before close yields nothing.
- [ ] An in-progress work order linking a superseded decision yields an advisory; a done work order linking one does not.
- [ ] Changing an approved document's body after its stamp yields an advisory; the approve flow's own guarded-line writes do not.
- [ ] All three advisories appear in `veri check` output, the UI advisories surface, and context packages via the existing pipeline, with zero new renderer code.
- [ ] `veri check` exit status is unaffected by drift advisories (DEC-025).
- [ ] Detectors run from git history on demand; no new files or caches appear in the knowledge base.
- [ ] This repo's own corpus is scanned: each finding is a true drift or the detector is fixed.
- [ ] Full suite and `veri check` clean.

## Receipts

(none yet)
