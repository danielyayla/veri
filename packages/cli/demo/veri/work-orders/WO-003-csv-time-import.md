---
id: WO-003
type: work-order
title: CSV time import
status: backlog
created: 2026-07-30
updated: 2026-08-01
links:
  - id: REQ-004
    rel: implements
---

## Summary

Import time entries from Toggl or Harvest CSV exports as invoice line
items. Blocked on [[REQ-004]] — the column-mapping source is missing.

## In scope

- CSV parser for the Toggl and Harvest export formats
- Column mapping per the spec referenced in [[REQ-004]]
- Imported entries become editable line items on a draft invoice

## Out of scope

- Live API integrations with time trackers
- De-duplication across repeated imports

## Requirements

All acceptance criteria of [[REQ-004]] verbatim (see that file).

## Acceptance tests

- [ ] A Toggl export lands as line items with hours, rate, and
      description mapped
- [ ] A malformed CSV reports which row failed, and imports nothing

## Receipts

(none yet)
