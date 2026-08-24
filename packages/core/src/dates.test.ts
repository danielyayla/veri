import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { GitFacts, VeriDocument } from './index.ts';
import { checkDrift, localToday } from './index.ts';

/**
 * WO-074 — the UTC/local date skew. Stamps must read the same calendar as
 * git's %cs committer dates (the committer's local zone), or every window
 * where the local date differs from the UTC date yields spurious
 * drift-approved-edited advisories on freshly stamped documents.
 *
 * Nothing here depends on the wall clock: instants are fixed and the zone is
 * pinned via process.env.TZ, which Node's Date honors at call time.
 */

function withTimezone<T>(tz: string, fn: () => T): T {
  const prev = process.env.TZ;
  process.env.TZ = tz;
  try {
    return fn();
  } finally {
    if (prev === undefined) delete process.env.TZ;
    else process.env.TZ = prev;
  }
}

test('localToday reads the local calendar, not UTC, on both sides of the boundary', () => {
  // 22:30 UTC on the 20th is already the 21st in UTC+3 (Etc/GMT-3 — POSIX
  // sign convention is inverted). The old producer said 2026-08-20 here.
  const lateEvening = new Date('2026-08-20T22:30:00Z');
  assert.equal(
    withTimezone('Etc/GMT-3', () => localToday(lateEvening)),
    '2026-08-21',
  );
  assert.notEqual(withTimezone('Etc/GMT-3', () => localToday(lateEvening)), lateEvening.toISOString().slice(0, 10));

  // 01:30 UTC on the 21st is still the 20th in UTC-3.
  const earlyMorning = new Date('2026-08-21T01:30:00Z');
  assert.equal(
    withTimezone('Etc/GMT+3', () => localToday(earlyMorning)),
    '2026-08-20',
  );

  // When local and UTC agree, so do the answers.
  assert.equal(withTimezone('UTC', () => localToday(lateEvening)), '2026-08-20');
});

// --- the WO-074 scenario, pinned: stamp at 01:30 local (UTC+3), commit it ---

function approvedWorkflow(approved: string): VeriDocument {
  return {
    id: 'WF-001',
    type: 'workflow',
    title: 'Workflow',
    status: 'accepted',
    approved,
    created: approved,
    updated: approved,
    file: 'workflow.md',
    links: [],
    frontmatter: {},
    body: '## The path of work\n\nx\n',
    inlineRefs: [],
  };
}

/** What %cs renders for the initial commit: the committer's local date. */
const SCAFFOLD_COMMIT: GitFacts = {
  commits: [
    {
      sha: 'a'.repeat(40),
      date: '2026-08-21',
      subject: 'initial scaffold',
      files: ['veri/workflow.md'],
    },
  ],
};

test('a stamp written and committed across the UTC/local boundary is not drift (WO-074)', () => {
  // 2026-08-20T22:30Z is 2026-08-21 01:30 in UTC+3 — the observed skew
  // window. The stamp the real producer writes agrees with the commit date,
  // so the fallback comparison (no lifecycle commit for WF-001) stays quiet.
  const stamped = withTimezone('Etc/GMT-3', () => localToday(new Date('2026-08-20T22:30:00Z')));
  assert.deepEqual(checkDrift([approvedWorkflow(stamped)], SCAFFOLD_COMMIT, 'veri'), []);

  // The regression, demonstrated: the old UTC producer stamped yesterday's
  // date for the same instant, and the very first commit read as an edit
  // after approval.
  const utcStamp = new Date('2026-08-20T22:30:00Z').toISOString().slice(0, 10);
  const spurious = checkDrift([approvedWorkflow(utcStamp)], SCAFFOLD_COMMIT, 'veri');
  assert.equal(spurious.length, 1);
  assert.equal(spurious[0].kind, 'drift-approved-edited');
  assert.equal(spurious[0].id, 'WF-001');
});
