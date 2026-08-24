---
id: WO-074
type: work-order
title: "Spurious drift advisories from UTC/local date skew in stamps vs git facts"
status: done
created: 2026-08-21
updated: 2026-08-24
links:
  - id: WO-045
    rel: follows-from
  - id: REQ-021
    rel: implements
  - id: SRC-010
    rel: designed-by
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

- [x] A project scaffolded and committed while local date != UTC date shows no drift-approved-edited advisory on WF-001 — snapshot.test.ts "a fresh scaffold committed while the local date differs from UTC shows no drift (WO-074)" pins a zone (UTC+14 or UTC-12) whose local date differs from UTC right now, scaffolds, commits, and asserts zero drift-approved-edited advisories
- [x] packages/ui snapshot.test.ts git tests pass regardless of wall-clock time and timezone — full snapshot.test.ts run green under TZ=Etc/GMT-14 and TZ=Etc/GMT+12 (9/9 both); stamps and %cs now read the same local calendar
- [x] A regression test fails on the old behavior across the date boundary — core dates.test.ts pins the observed window (2026-08-20T22:30Z = 01:30 local in UTC+3) with fixed instants under process.env.TZ: localToday's stamp yields no advisory from checkDrift, while the old toISOString().slice(0, 10) stamp for the same instant yields the spurious drift-approved-edited on WF-001

## Receipts

- 2026-08-24 — ebc19c4 — packages/core/src/{dates,dates.test,scaffold,create,approve,save,links,index}.ts, packages/core/package.json, packages/mcp/src/writeback.ts, packages/ui/src/lib/{write,write.test,snapshot.test}.ts, packages/ui/src/renderer/views/{review,templates}.ts, veri/decisions/DEC-076 — one localToday() producer replaces every UTC date stamp so stamps match git %cs committer dates; regression tests pin the skew wall-clock-free; DEC-076 filed (proposed)
- 2026-08-24 — 35ddb30 — veri/work-orders/WO-074-spurious-drift-advisories-from-utc-local-date-skew-in-stamps.md — DEC-076 approved by Daniel (stamp commit e9540d6); last blocker cleared, status flipped to done