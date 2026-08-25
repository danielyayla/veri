/**
 * The one clock for document date stamps (WO-074): the LOCAL calendar date.
 *
 * Git renders committer dates (%cs, the drift detectors' input) in the
 * commit's own recorded UTC offset — the committer's local zone. Stamping
 * documents with the UTC date while comparing against %cs made every window
 * where the local date is ahead of the UTC date (e.g. 00:00–03:00 local in
 * UTC+3) produce spurious drift-approved-edited advisories on a freshly
 * scaffolded project: the stamp carried yesterday's UTC date, the commit
 * today's local date. Every stamp producer (scaffold, create, approve,
 * save's `updated:` bump, links, receipts, the UI's write paths) goes
 * through this function so both sides of the comparison read the same
 * calendar.
 *
 * Pure and browser-safe — exported as the `@verikb/core/dates` subpath so the
 * renderer bundle can share it.
 */
export function localToday(now: Date = new Date()): string {
  const y = String(now.getFullYear()).padStart(4, '0');
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
