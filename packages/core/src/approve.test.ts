import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
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
  const issues = checkProject(load).filter((issue) => 'file' in issue && issue.file !== 'requirements/REQ-002-broken-draft.md');
  assert.deepEqual(issues, []);
});

test('approve refuses documents that are not pending', async (t) => {
  const dir = sandbox(t);
  await approveDocument(dir, 'REQ-001', '2026-08-10');
  await assert.rejects(() => approveDocument(dir, 'REQ-001'), /nothing to approve — REQ-001 is accepted/);
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
