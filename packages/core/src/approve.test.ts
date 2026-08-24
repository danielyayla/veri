import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { approveDocument } from './approve.ts';
import { loadProject } from './load.ts';
import { checkProject } from './check.ts';

const FIXTURE = fileURLToPath(new URL('../fixtures/approve', import.meta.url));

function sandbox(t: { after(fn: () => void): void }): string {
  const dir = mkdtempSync(join(tmpdir(), 'veri-approve-test-'));
  cpSync(FIXTURE, dir, { recursive: true });
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

test('approving a draft requirement flips status, stamps the date, and touches nothing else', async (t) => {
  const dir = sandbox(t);
  const before = readFileSync(join(dir, 'requirements/REQ-001-clean-draft.md'), 'utf8');

  const result = await approveDocument(dir, 'req-001', '2026-08-10');
  assert.deepEqual(result, {
    id: 'REQ-001',
    file: 'requirements/REQ-001-clean-draft.md',
    from: 'draft',
    to: 'accepted',
    approved: '2026-08-10',
  });

  const after = readFileSync(join(dir, result.file), 'utf8');
  assert.match(after, /^status: accepted$/m);
  assert.match(after, /^approved: 2026-08-10$/m);
  assert.match(after, /^updated: 2026-08-10$/m);
  // The edit is line-targeted: everything outside the three stamped lines survives byte-for-byte.
  const strip = (s: string): string => s.replace(/^(status|approved|updated): .*\n/gm, '');
  assert.equal(strip(after), strip(before));

  const load = await loadProject(dir);
  const doc = load.documents.find((d) => d.id === 'REQ-001');
  assert.equal(doc?.status, 'accepted');
  assert.equal(doc?.approved, '2026-08-10');
});

test('approving a proposed decision makes it active and the project stays check-clean', async (t) => {
  const dir = sandbox(t);
  const result = await approveDocument(dir, 'DEC-001', '2026-08-10');
  assert.equal(result.from, 'proposed');
  assert.equal(result.to, 'active');

  const load = await loadProject(dir);
  // REQ-002's broken link remains the fixture's only issue; the approval itself adds none.
  const issues = checkProject(load).issues.filter((issue) => 'file' in issue && issue.file !== 'requirements/REQ-002-broken-draft.md');
  assert.deepEqual(issues, []);
});

test('approve refuses documents in a non-approvable status', async (t) => {
  // Pending → approve, promoted → re-stamp (WO-045); anything else — a
  // retired requirement, a superseded decision — has nothing to approve.
  const dir = sandbox(t);
  const file = join(dir, 'requirements/REQ-001-clean-draft.md');
  writeFileSync(file, readFileSync(file, 'utf8').replace('status: draft', 'status: retired'));
  await assert.rejects(() => approveDocument(dir, 'REQ-001'), /nothing to approve — REQ-001 is retired/);
});

test('approve refuses non-approvable types and unknown ids', async (t) => {
  const dir = sandbox(t);
  await assert.rejects(() => approveDocument(dir, 'WO-001'), /is a work-order — only requirements, decisions and workflows/);
  await assert.rejects(() => approveDocument(dir, 'REQ-999'), /no document with id REQ-999/);
});

test('approving a draft workflow makes it accepted (DEC-018)', async (t) => {
  const dir = sandbox(t);
  const result = await approveDocument(dir, 'WF-001', '2026-08-12');
  assert.deepEqual(result, {
    id: 'WF-001',
    file: 'workflow.md',
    from: 'draft',
    to: 'accepted',
    approved: '2026-08-12',
  });
  const after = readFileSync(join(dir, 'workflow.md'), 'utf8');
  assert.match(after, /^status: accepted$/m);
  assert.match(after, /^approved: 2026-08-12$/m);
});

test('approve refuses a document with outstanding check issues', async (t) => {
  const dir = sandbox(t);
  await assert.rejects(
    () => approveDocument(dir, 'REQ-002', '2026-08-10'),
    /refusing to approve REQ-002 — fix its check issue/,
  );
  const raw = readFileSync(join(dir, 'requirements/REQ-002-broken-draft.md'), 'utf8');
  assert.match(raw, /^status: draft$/m); // untouched
});

test('approve validates the date format', async (t) => {
  const dir = sandbox(t);
  await assert.rejects(() => approveDocument(dir, 'REQ-001', 'tomorrow'), /must be YYYY-MM-DD/);
});

// --- Multi-maintainer stamps (REQ-026, DEC-071) ---

function declareMaintainers(dir: string): void {
  const path = join(dir, 'workflow.md');
  writeFileSync(path, readFileSync(path, 'utf8').replace(/^status: /m, 'maintainers:\n  - Ada\n  - Grace\nstatus: '));
}

test('a maintainers project requires the stamp to name a listed maintainer', async (t) => {
  const dir = sandbox(t);
  declareMaintainers(dir);
  await assert.rejects(() => approveDocument(dir, 'REQ-001', '2026-08-24'), /must name one.*--as.*Ada, Grace/s);
  await assert.rejects(() => approveDocument(dir, 'REQ-001', '2026-08-24', 'Mallory'), /"Mallory" is not in the workflow's maintainers list/);

  const result = await approveDocument(dir, 'REQ-001', '2026-08-24', 'Grace');
  assert.equal(result.approvedBy, 'Grace');
  const after = readFileSync(join(dir, result.file), 'utf8');
  // The name rides directly under the date, by the same line-targeted edit.
  assert.match(after, /^approved: 2026-08-24\napproved_by: Grace$/m);

  // Re-approval by another maintainer replaces the line, never duplicates it.
  const again = await approveDocument(dir, 'REQ-001', '2026-08-25', 'Ada');
  const restamped = readFileSync(join(dir, again.file), 'utf8');
  assert.match(restamped, /^approved_by: Ada$/m);
  assert.equal((restamped.match(/^approved_by: /gm) ?? []).length, 1);
});

test('a solo project records an explicitly named approver and never demands one', async (t) => {
  const dir = sandbox(t);
  const named = await approveDocument(dir, 'REQ-001', '2026-08-24', 'Ada');
  assert.equal(named.approvedBy, 'Ada');
  assert.match(readFileSync(join(dir, named.file), 'utf8'), /^approved_by: Ada$/m);
  // No maintainers list: a nameless stamp stays exactly today's behavior.
  const plain = await approveDocument(dir, 'DEC-001', '2026-08-24');
  assert.equal(plain.approvedBy, undefined);
  assert.doesNotMatch(readFileSync(join(dir, plain.file), 'utf8'), /^approved_by:/m);
});

test('re-approving an already-accepted document re-stamps in place (WO-045 drift remedy)', async (t) => {
  const dir = sandbox(t);
  await approveDocument(dir, 'REQ-001', '2026-08-10');

  const again = await approveDocument(dir, 'REQ-001', '2026-08-18');
  assert.deepEqual(again, {
    id: 'REQ-001',
    file: 'requirements/REQ-001-clean-draft.md',
    from: 'accepted',
    to: 'accepted',
    approved: '2026-08-18',
  });
  const after = readFileSync(join(dir, again.file), 'utf8');
  assert.match(after, /^status: accepted$/m);
  assert.match(after, /^approved: 2026-08-18$/m);
  assert.equal((after.match(/^approved: /gm) ?? []).length, 1, 'one approved line, replaced not duplicated');
});
