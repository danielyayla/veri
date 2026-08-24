---
id: DEC-076
type: decision
title: "Document date stamps read the local calendar, matching git committer dates"
status: active
approved: 2026-08-24
created: 2026-08-24
updated: 2026-08-24
links:
  - id: WO-074
    rel: constrains
  - id: DEC-041
    rel: follows-from
  - id: REQ-021
    rel: satisfies
---

## Choice

Every date a Veri surface writes into a document — `created:`/`updated:`
on create, the `updated:` bump on save and link edits, the `approved:`
stamp, scaffold's workflow stamp, receipt defaults — is the **local
calendar date**, produced by one shared function, `localToday()` in
`@veri/core` (also exported as the browser-safe `@veri/core/dates`
subpath for the renderer bundle). Previously stamps used the UTC date
(`toISOString().slice(0, 10)`) while the drift detectors' fallback
compared them against git `%cs` committer dates, which git renders in the
committer's own recorded zone — so in any window where the local date had
crossed the boundary ahead of UTC (e.g. 00:00–03:00 local in UTC+3), a
freshly scaffolded, immediately committed project reported a spurious
`drift-approved-edited` advisory on WF-001, and packages/ui's git-backed
snapshot tests failed. Both sides of the comparison now read the same
clock: the one on the committer's wall. Day granularity stays ([[DEC-041]]),
and drift detector semantics are untouched — only the stamp producer moved.

## Rejected alternatives

- **Render git dates in UTC instead (`%cd` with `--date=format-local`/UTC
  tricks) and keep UTC stamps** — requires every host collector (CLI,
  desktop app) to pass extra date-format plumbing through `GIT_LOG_FORMAT`,
  and still mismatches what `git log` shows a human by default; the stamp
  in the file would disagree with the date the committer sees everywhere
  else.
- **Sub-day precision (full timestamps in stamps)** — would make the skew
  unrepresentable, but changes the document format for every existing
  stamp and is explicitly out of scope per the drift advisory design's
  day-granularity ruling ([[DEC-041]]).
- **Tolerate ±1 day in the drift fallback comparison** — hides the skew
  instead of removing it, and widens the fallback's blind window from
  same-day edits to same-and-next-day edits for everyone, degrading a real
  detector to fix a producer bug.

## Rationale

The drift fallback ([[DEC-041]]) compares stamp dates to `%cs`, and `%cs`
is defined by the commit's own recorded offset — the committer's local
zone. A stamp written seconds before that commit should never disagree
with it, and the only convention that guarantees this is stamping from
the same local clock. One shared producer makes the convention a single
point of truth instead of nine scattered `toISOString().slice(0, 10)`
call sites, so no future surface can silently reintroduce the skew.
