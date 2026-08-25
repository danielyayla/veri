---
id: WO-104
type: work-order
title: "Bump the on-disk format when the document schema gains states old readers misread"
status: ready
approved: 2026-08-25
created: 2026-08-25
updated: 2026-08-25
links:
  - id: REQ-015
    rel: implements
  - id: WO-098
    rel: relates-to
  - id: DEC-030
    rel: relates-to
---

## Summary

The installed Veri.app 0.2.1 showed "DEC-097 references [[WO-101]] inline but no document has that id" and disabled Approve, while the CLI correctly approved. Root cause: WO-098 added the work-order `ready` status (plus `approved`/`approved_by` on work orders) without bumping CURRENT_FORMAT, so the packaged app's older bundled core rejects `status: ready` frontmatter, drops those work orders from its document set, and misreports every inline reference to them as a broken link. REQ-015's guard exists exactly for this — a newer format is stated, never opened — but only fires on a format bump. Deliver: bump CURRENT_FORMAT to 2 with a `veri migrate` step (the marker file alone; documents are already valid), so stale apps refuse with the format statement instead of misreporting; and add a release-checklist rule (RELEASING.md) that any schema change an older reader would misparse — new enum values, newly required fields — requires a format bump in the same change.

## In scope

- Bump `CURRENT_FORMAT` to 2 in packages/core/src/format.ts and teach `migrateProject` the 1→2 step (rewrite the marker; no document rewrites needed)
- Verify the packaged 0.2.1 app refuses a format-2 project with the REQ-015 statement rather than opening and misreporting
- A RELEASING.md checklist item: schema additions old readers misparse (new status values, new required fields) ship with a format bump

## Out of scope

- Retro-fixing already-installed app versions (impossible; the format bump is what makes them fail loudly)
- Auto-update delivery of the new app build (WO-034's pipeline)
- Any change to the approve gate itself — CLI/core gating behaved correctly

## Requirements

- [[REQ-015]] — implements
- [[WO-098]] — relates-to
- [[DEC-030]] — relates-to

## Acceptance tests

- [ ] A veri/ directory with `format` = 2 makes a core built at CURRENT_FORMAT 1 classify it as `newer` and refuse to open, stating the format
- [ ] `veri migrate` on a format-1 project writes `format` = 2 and leaves every document byte-identical
- [ ] `veri check` on the migrated project reports 0 issues
- [ ] RELEASING.md names the schema-change → format-bump rule

## Receipts

(none yet)
