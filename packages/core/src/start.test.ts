import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { approveDocument } from './approve.ts';
import { startWorkOrder } from './start.ts';
import { loadProject } from './load.ts';
import { checkProject } from './check.ts';

const FIXTURE = fileURLToPath(new URL('../fixtures/approve', import.meta.url));

function sandbox(t: { after(fn: () => void): void }): string {
  const dir = mkdtempSync(join(tmpdir(), 'veri-start-test-'));
  cpSync(FIXTURE, dir, { recursive: true });
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

/** The full dispatch path: approve readies WO-001, start claims it. */
async function readied(dir: string): Promise<void> {
  await approveDocument(dir, 'REQ-001', '2026-08-10');
  await approveDocument(dir, 'WO-001', '2026-08-10');
}

test('starting a ready work order flips it to in-progress, records the claim, and touches nothing else', async (t) => {
  const dir = sandbox(t);
  await readied(dir);
  const before = readFileSync(join(dir, 'work-orders/WO-001-not-approvable.md'), 'utf8');

  const result = await startWorkOrder(dir, 'wo-001', 'agent-42', '2026-08-11');
  assert.deepEqual(result, {
    id: 'WO-001',
    file: 'work-orders/WO-001-not-approvable.md',
    claimedBy: 'agent-42',
    claimedAt: '2026-08-11',
  });

  const after = readFileSync(join(dir, result.file), 'utf8');
  assert.match(after, /^status: in-progress\nclaimed_by: agent-42\nclaimed_at: 2026-08-11$/m);
  assert.match(after, /^updated: 2026-08-11$/m);
  // Line-targeted edit: everything outside the touched lines survives byte-for-byte.
  const strip = (s: string): string => s.replace(/^(status|claimed_by|claimed_at|updated): .*\n/gm, '');
  assert.equal(strip(after), strip(before));

  // The claim parses back into the document and the corpus stays claim-clean.
  const load = await loadProject(dir);
  const doc = load.documents.find((d) => d.id === 'WO-001');
  assert.equal(doc?.status, 'in-progress');
  assert.equal(doc?.claimedBy, 'agent-42');
  assert.equal(doc?.claimedAt, '2026-08-11');
  const issues = checkProject(load).issues.filter((issue) => 'file' in issue && issue.file !== 'requirements/REQ-002-broken-draft.md');
  assert.deepEqual(issues, []);
});

test('only cleared work starts: backlog is refused toward the approve stamp, done has nothing to start', async (t) => {
  const dir = sandbox(t);
  // Backlog — the clearance has not been stamped.
  await assert.rejects(() => startWorkOrder(dir, 'WO-001', 'agent-42'), /only cleared work starts.*veri approve WO-001/s);
  // Non-work-orders never start.
  await assert.rejects(() => startWorkOrder(dir, 'REQ-001', 'agent-42'), /is a requirement — only work orders start/);
  // Unknown id.
  await assert.rejects(() => startWorkOrder(dir, 'WO-999', 'agent-42'), /no document with id WO-999/);
  // A claim with no holder is no claim.
  await readied(dir);
  await assert.rejects(() => startWorkOrder(dir, 'WO-001', '   '), /a claim names its holder/);
});

test('a second start on a claimed work order is refused, naming the holder', async (t) => {
  const dir = sandbox(t);
  await readied(dir);
  await startWorkOrder(dir, 'WO-001', 'agent-42', '2026-08-11');
  await assert.rejects(
    () => startWorkOrder(dir, 'WO-001', 'agent-43'),
    /refusing to start WO-001 — it is already in-progress, claimed by "agent-42" since 2026-08-11/,
  );
});

test('the start date must be a calendar date', async (t) => {
  const dir = sandbox(t);
  await readied(dir);
  await assert.rejects(() => startWorkOrder(dir, 'WO-001', 'agent-42', 'yesterday'), /claim date must be YYYY-MM-DD/);
});
