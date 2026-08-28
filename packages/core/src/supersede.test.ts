import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { supersedeDecision } from './supersede.ts';
import { loadProject } from './load.ts';
import { checkProject } from './check.ts';

/** A decision file, frontmatter in the corpus's canonical order. */
function decision(id: string, title: string, status: string, extra = ''): string {
  const approved = status === 'active' || status === 'superseded' ? 'approved: 2026-08-02\n' : '';
  return `---\nid: ${id}\ntype: decision\ntitle: ${title}\nstatus: ${status}\n${extra}${approved}created: 2026-08-01\nupdated: 2026-08-02\n---\n\n## Choice\n\nThe choice, preserved verbatim.\n\n## Rejected alternatives\n\nThe other road.\n\n## Rationale\n\nWhy.\n`;
}

function sandbox(t: { after(fn: () => void): void }): string {
  const dir = mkdtempSync(join(tmpdir(), 'veri-supersede-test-'));
  mkdirSync(join(dir, 'decisions'), { recursive: true });
  mkdirSync(join(dir, 'requirements'), { recursive: true });
  writeFileSync(join(dir, 'decisions', 'DEC-001-old.md'), decision('DEC-001', 'The old road', 'active'));
  writeFileSync(join(dir, 'decisions', 'DEC-002-new.md'), decision('DEC-002', 'The new road', 'active'));
  writeFileSync(join(dir, 'decisions', 'DEC-003-pending.md'), decision('DEC-003', 'A proposal', 'proposed'));
  writeFileSync(
    join(dir, 'requirements', 'REQ-001-req.md'),
    '---\nid: REQ-001\ntype: requirement\ntitle: A requirement\nstatus: accepted\napproved: 2026-08-02\ncreated: 2026-08-01\nupdated: 2026-08-02\n---\n\nIt must hold.\n\n## Acceptance criteria\n\n- [ ] It holds\n',
  );
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

test('supersede writes the status and its successor together, leaving the body byte-for-byte (WO-138)', async (t) => {
  const dir = sandbox(t);
  const before = readFileSync(join(dir, 'decisions/DEC-001-old.md'), 'utf8');

  const result = await supersedeDecision(dir, 'dec-001', 'dec-002', '2026-08-28');
  assert.deepEqual(result, { id: 'DEC-001', file: 'decisions/DEC-001-old.md', from: 'active', successor: 'DEC-002' });

  const after = readFileSync(join(dir, 'decisions/DEC-001-old.md'), 'utf8');
  // The successor rides directly under status, the position the corpus reads in.
  assert.match(after, /^status: superseded\nsuperseded_by: DEC-002$/m);
  assert.match(after, /^updated: 2026-08-28$/m);
  assert.equal(after.slice(after.indexOf('---\n\n')), before.slice(before.indexOf('---\n\n')));
  assert.match(after, /^approved: 2026-08-02$/m); // the original stamp is untouched

  const load = await loadProject(dir);
  const doc = load.documents.find((entry) => entry.id === 'DEC-001');
  assert.equal(doc?.status, 'superseded');
  assert.equal(doc?.supersededBy, 'DEC-002');
  // The schema's pair invariant holds, so the flip never lands as a violation.
  assert.deepEqual(checkProject(load).issues, []);
});

test('a successor that is not yet approved is refused, naming the stamp that unblocks it (REQ-008, WO-138)', async (t) => {
  const dir = sandbox(t);
  await assert.rejects(
    supersedeDecision(dir, 'DEC-001', 'DEC-003'),
    /DEC-003 is proposed, not active — approve it first \(veri approve DEC-003\)/,
  );
  // Nothing moved: the old decision still governs until the new one binds.
  assert.match(readFileSync(join(dir, 'decisions/DEC-001-old.md'), 'utf8'), /^status: active$/m);
});

test('supersede refuses everything that is not one active decision replacing another (WO-138)', async (t) => {
  const dir = sandbox(t);
  await assert.rejects(supersedeDecision(dir, 'DEC-001', 'DEC-001'), /cannot supersede itself/);
  await assert.rejects(supersedeDecision(dir, 'REQ-001', 'DEC-002'), /REQ-001 is a requirement — supersession covers decisions/);
  await assert.rejects(supersedeDecision(dir, 'DEC-001', 'REQ-001'), /REQ-001 is a requirement — only a decision can succeed a decision/);
  await assert.rejects(supersedeDecision(dir, 'DEC-003', 'DEC-002'), /DEC-003 is not active: it is proposed/);
  await assert.rejects(supersedeDecision(dir, 'DEC-404', 'DEC-002'), /no document with id DEC-404/);
  await assert.rejects(supersedeDecision(dir, 'DEC-001', 'DEC-404'), /no document with id DEC-404/);
  await assert.rejects(supersedeDecision(dir, 'DEC-001', 'DEC-002', '28-08-2026'), /must be YYYY-MM-DD/);
  // Every refusal left the corpus exactly as it found it.
  assert.deepEqual(checkProject(await loadProject(dir)).issues, []);
});

test('an already-superseded decision is refused, naming what governs instead (WO-138)', async (t) => {
  const dir = sandbox(t);
  await supersedeDecision(dir, 'DEC-001', 'DEC-002', '2026-08-28');
  await assert.rejects(
    supersedeDecision(dir, 'DEC-001', 'DEC-002'),
    /DEC-001 is not active: it is already superseded by DEC-002/,
  );
});

test('a withdrawn decision has nothing left to retire (DEC-110, WO-138)', async (t) => {
  const dir = sandbox(t);
  writeFileSync(join(dir, 'decisions', 'DEC-004-gone.md'), decision('DEC-004', 'Abandoned', 'withdrawn'));
  await assert.rejects(supersedeDecision(dir, 'DEC-004', 'DEC-002'), /it is withdrawn — out of play/);
});

test('a stray superseded_by on an active decision is replaced, never doubled (WO-138)', async (t) => {
  const dir = sandbox(t);
  // Hand-edited frontmatter is the only way to reach this state; the pair
  // must still come out well-formed rather than with two successor lines.
  writeFileSync(
    join(dir, 'decisions', 'DEC-005-stale.md'),
    decision('DEC-005', 'Carries a stale successor', 'active', 'superseded_by: DEC-003\n'),
  );
  await supersedeDecision(dir, 'DEC-005', 'DEC-002', '2026-08-28');
  const after = readFileSync(join(dir, 'decisions/DEC-005-stale.md'), 'utf8');
  assert.equal(after.match(/^superseded_by:/gm)?.length, 1);
  assert.match(after, /^status: superseded\nsuperseded_by: DEC-002$/m);
});

test('work standing on the freshly superseded decision reports as drift (WO-138)', async (t) => {
  const dir = sandbox(t);
  mkdirSync(join(dir, 'work-orders'), { recursive: true });
  writeFileSync(
    join(dir, 'work-orders', 'WO-001-standing.md'),
    '---\nid: WO-001\ntype: work-order\ntitle: Work under the old road\nstatus: in-progress\nclaimed_by: session-alpha\nclaimed_at: 2026-08-27\napproved: 2026-08-02\ncreated: 2026-08-01\nupdated: 2026-08-02\nlinks:\n  - id: DEC-001\n    rel: implements\n---\n\n## Summary\n\nWork.\n\n## Receipts\n\n- 2026-08-27 — abc1234 — src/x.ts — did a thing\n',
  );
  // Before: the authority is live, so nothing is flagged.
  assert.deepEqual(checkProject(await loadProject(dir)).advisories.filter((entry) => entry.kind === 'drift-superseded-link'), []);

  await supersedeDecision(dir, 'DEC-001', 'DEC-002', '2026-08-28');

  const after = checkProject(await loadProject(dir)).advisories.filter((entry) => entry.kind === 'drift-superseded-link');
  assert.equal(after.length, 1);
  assert.match((after[0] as { message: string }).message, /WO-001 is in-progress but stands on DEC-001, which is superseded by DEC-002/);
});
