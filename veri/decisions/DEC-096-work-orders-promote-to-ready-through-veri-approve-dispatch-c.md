---
id: DEC-096
type: decision
title: "Work orders promote to ready through veri approve — dispatch clearance is the fourth stamped promotion"
status: superseded
superseded_by: DEC-143
approved: 2026-08-25
created: 2026-08-25
updated: 2026-09-01
links:
  - id: WO-098
    rel: constrains
  - id: REQ-008
    rel: extends
  - id: DEC-071
    rel: consistent-with
  - id: DEC-072
    rel: consistent-with
  - id: DEC-015
    rel: builds-on
  - id: DEC-022
    rel: consistent-with
---

## Choice

The `ready` status (backlog → ready → in-progress → done) is entered only through the existing approval act: `veri approve <WO-id>` promotes a backlog work order to ready with the same `approved:` / `approved_by:` stamp mechanics as the other three promotions ([[DEC-071]], [[DEC-072]] apply unchanged — maintainer validation, the stamp riding a commit whose subject names the id and "approved" for [[DEC-041]] lifecycle recognition). Approval is refused prospectively when the work order links no requirement or links any still-pending document, so ready is born check-clean. `isPromoted` treats a ready work order like an accepted requirement — ready without a stamp is a `missing-approval` issue — while in-progress and done are past approving: execution spends the clearance, historical work orders that never passed through ready stay valid without stamps, and the drift detector exempts stamped work orders that have left ready (receipts and checked boxes are progress, not drift). The started-work gates (gated-wo, wo-without-requirement, the design gate) cover ready exactly as they cover in-progress. The on-disk format stays 1 — the change is an additive enum value; older CLIs report a ready work order as invalid frontmatter until upgraded, acceptable under lockstep 0.x versioning ([[DEC-077]]).

## Rejected alternatives

- **A sibling verb (`veri ready <id>`)** — a second stamped promotion path would duplicate the maintainer validation, the line-targeted edit discipline ([[DEC-015]]), and the app's approve surface for no semantic gain; dispatch clearance *is* an approval.
- **A `dispatch: true` frontmatter flag instead of a status** — invisible in `veri list`, orthogonal to the lifecycle it actually belongs to, and every status-driven surface (search ranking, gates, the app) would need a second axis.
- **Ready without a stamp (a plain status edit)** — reopens the exact hole REQ-008 closes: an agent could clear its own work for dispatch; the status only existing via the stamp is the point.
- **Requiring stamps on in-progress/done as well** — would retroactively invalidate every existing work order and add ceremony to states whose gate (the receipt discipline) already exists.
- **A format bump to 2** — the marker exists for changes that misparse silently; an unknown enum value fails loudly as invalid frontmatter, which is the correct failure already.

## Rationale

The approval stamp is Veri's one mechanism for "the user ratified this"; dispatch clearance is that same act pointed at a work order, so reusing the verb keeps one stamp discipline, one audit trail, and one app surface. Prospective refusal (rather than letting the stamp land and the check flag it) keeps the invariant that approval never manufactures a violation. Treating execution as spending the clearance keeps the stamp's meaning honest — it ratified the spec at dispatch time, not every receipt appended afterwards — and keeps drift advisories quiet on the normal path of work.
