---
id: WO-002
type: work-order
title: PDF export pipeline
status: in-progress
claimed_by: ana
claimed_at: 2026-07-30
created: 2026-07-30
updated: 2026-08-06
links:
  - id: REQ-002
    rel: implements
---

## Summary

Wire Typst rendering into the export flow: template selection, data
mapping from invoice records, and a validated PDF written to the project
outbox. This closes the last acceptance gap on [[REQ-002]].

## In scope

- Typst template runtime with the three built-in templates (default,
  compact, letterhead)
- Invoice record → template data mapper with locale-aware currency and
  date formatting
- `skiff export` CLI command and the Export button in the invoice view
- PDF/A-2b validation step before the file lands in the outbox

## Out of scope

- Custom user-authored templates (future work order)
- Batch export and email delivery

## Requirements

All acceptance criteria of [[REQ-002]] verbatim (see that file). Template
engine per [[DEC-005]]; export runs in the Rust core per [[DEC-002]].

## Acceptance tests

- [x] `skiff export 0042 --template compact` writes a valid PDF to the
      outbox
- [x] Golden-file snapshot tests pass for all three templates
- [ ] Benchmark: 3-page invoice exports in under 2 s on the reference
      machine
- [ ] veraPDF reports PDF/A-2b conformance for every template

## Receipts

(none yet)
