---
id: WO-074
type: work-order
title: "Spurious drift advisories from UTC/local date skew in stamps vs git facts"
status: backlog
created: 2026-08-21
updated: 2026-08-21
links:
  - id: WO-045
    rel: follows-from
---

## Summary

Core stamps documents with the UTC calendar date (today() = new Date().toISOString().slice(0,10) in scaffold.ts, and equivalents in create/approve paths) while the drift detectors compare those stamps against git committer dates rendered in the machine's local timezone (%cs in GIT_LOG_FORMAT). Whenever the local date is ahead of the UTC date (e.g. 00:00–03:00 local in UTC+3), a freshly scaffolded project committed to git immediately shows a false "drift-approved-edited WF-001" advisory: the workflow's approved: stamp carries yesterday's UTC date and the commit carries today's local date. The same skew window makes packages/ui's snapshot.test.ts git tests fail (observed 2026-08-21 during WO-073: two tests failed before 03:00 local and passed after). Fix by picking one clock for both sides — likely stamping with the local date to match git — and make the affected tests immune to the wall clock.

## In scope

- Align document date stamping (scaffold today(), createDocument, approve) and drift comparison onto one timezone convention
- Regression test that pins the skew scenario (stamp date vs commit date across the UTC/local boundary) without depending on the wall clock
- Audit other date producers (updated: bumps in save, receipts) for the same skew

## Out of scope

- Any change to drift detector semantics beyond the clock alignment
- Sub-day precision for stamps (day granularity stays, per the drift advisory design)

## Requirements

- [[WO-045]] — follows-from

## Acceptance tests

- [ ] A project scaffolded and committed while local date != UTC date shows no drift-approved-edited advisory on WF-001
- [ ] packages/ui snapshot.test.ts git tests pass regardless of wall-clock time and timezone
- [ ] A regression test fails on the old behavior across the date boundary

## Receipts

(none yet)
