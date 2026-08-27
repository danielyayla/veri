---
id: WO-104
type: work-order
title: "Bump the on-disk format when the document schema gains states old readers misread"
status: ready
approved: 2026-08-27
created: 2026-08-25
updated: 2026-08-27
links:
  - id: REQ-015
    rel: implements
  - id: WO-098
    rel: relates-to
  - id: DEC-030
    rel: relates-to
  - id: WO-109
    rel: relates-to
---

## Summary

The installed Veri.app 0.2.1 showed "DEC-097 references [[WO-101]] inline but no document has that id" and disabled Approve, while the CLI correctly approved. Root cause: WO-098 added the work-order `ready` status (plus `approved`/`approved_by` on work orders) without bumping CURRENT_FORMAT, so the packaged app's older bundled core rejects `status: ready` frontmatter, drops those work orders from its document set, and misreports every inline reference to them as a broken link. REQ-015's guard exists exactly for this — a newer format is stated, never opened — but only fires on a format bump.

**Scope amended 2026-08-26 (at Daniel's instruction).** The bump itself is done: [[WO-109]] added the `withdrawn` status, which is the same class of schema change, and carried `CURRENT_FORMAT` to 2 with the marker-only 1→2 migration step in the same commit — one bump for both additions, per this work order's own rule. This project is migrated and the shipped 0.2.1 core was verified to refuse it with the REQ-015 statement. The receipt below records that. What remains here is the durable half: the release-checklist rule that makes the next schema change bump the format without needing an incident to remind anyone.

## In scope

- A RELEASING.md checklist item: a schema addition an older reader would misparse — a new status value, a new required field, a new enum member — ships with a format bump in the same change
- The item states the failure mode it prevents, so its reason survives without this work order: an old reader does not fail on unknown frontmatter, it drops the document and then misreports every reference to it
- A pointer from the item to REQ-015 and DEC-030, so a reader reaches the mechanism (the `veri/format` marker and the newer-format refusal) rather than only the rule

## Out of scope

- The `CURRENT_FORMAT` bump, the 1→2 migration step, and the format-2 verification against the packaged app — all delivered in WO-109 (commit 8fc577d); see the receipt
- Any further format bump; the next one belongs to the change that earns it
- Retro-fixing already-installed app versions (impossible; the format bump is what makes them fail loudly)
- Auto-update delivery of the new app build (WO-034's pipeline)
- Rebuilding or re-releasing the desktop app so it can open format-2 projects again — real, and its own work order
- Any change to the approve gate itself — CLI/core gating behaved correctly

## Requirements

- [[REQ-015]] — implements
- [[WO-098]] — relates-to
- [[DEC-030]] — relates-to
- [[WO-109]] — relates-to

## Acceptance tests

- [ ] RELEASING.md names the schema-change → format-bump rule as a checklist item
- [ ] The item names the concrete triggers (new status value, new required field, new enum member) rather than "schema changes" alone
- [ ] The item states the failure mode — an old reader drops the document and misreports its references — and points at [[REQ-015]] and [[DEC-030]]
- [x] A veri/ directory with `format` = 2 makes a core built at CURRENT_FORMAT 1 classify it as `newer` and refuse to open, stating the format
- [x] `veri migrate` on a format-1 project writes `format` = 2 and leaves every document byte-identical
- [x] `veri check` on the migrated project reports 0 issues

## Receipts

- 2026-08-26 — 8fc577d — packages/core/src/format.ts, packages/core/src/format.test.ts, packages/core/src/scaffold.test.ts, packages/cli/src/commands.test.ts, veri/format — the format half, delivered under WO-109: CURRENT_FORMAT 2 with a marker-only 1→2 migration step, this project migrated, and the shipped Veri.app 0.2.1 core verified to answer "this project uses veri format 2 … update Veri to open it" instead of dropping the documents and misreporting their references. The RELEASING.md rule is what remains open here.
