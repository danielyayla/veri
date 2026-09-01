import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { approveDocument } from './approve.ts';
import { dispatchWorkOrder } from './dispatch.ts';
import { loadProject } from './load.ts';
import { checkProject } from './check.ts';

const FIXTURE = fileURLToPath(new URL('../fixtures/approve', import.meta.url));

function sandbox(t: { after(fn: () => void): void }): string {
  const dir = mkdtempSync(join(tmpdir(), 'veri-dispatch-test-'));
  cpSync(FIXTURE, dir, { recursive: true });
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

/** WO-001 links REQ-001 (draft in the fixture) — ratify it so the pending
    gate passes and the trace reaches a live requirement. */
async function ratified(dir: string): Promise<void> {
  await approveDocument(dir, 'REQ-001', '2026-08-10');
}

test('dispatch flips backlog to in-progress with stamp and claim in one write, touching nothing else (DEC-143)', async (t) => {
  const dir = sandbox(t);
  await ratified(dir);
  const before = readFileSync(join(dir, 'work-orders/WO-001-not-approvable.md'), 'utf8');

  const result = await dispatchWorkOrder(dir, 'wo-001', 'agent-42', { date: '2026-08-11' });
  assert.deepEqual(result, {
    id: 'WO-001',
    file: 'work-orders/WO-001-not-approvable.md',
    approved: '2026-08-11',
    stamped: true,
    claimedBy: 'agent-42',
    claimedAt: '2026-08-11',
  });

  const after = readFileSync(join(dir, result.file), 'utf8');
  // One gesture: the stamp and the claim land together, under the status.
  assert.match(after, /^status: in-progress\napproved: 2026-08-11\nclaimed_by: agent-42\nclaimed_at: 2026-08-11$/m);
  assert.match(after, /^updated: 2026-08-11$/m);
  // Line-targeted edit: everything outside the touched lines survives byte-for-byte.
  const strip = (s: string): string => s.replace(/^(status|approved|claimed_by|claimed_at|updated): .*\n/gm, '');
  assert.equal(strip(after), strip(before));

  // The flip parses back and in-progress is born check-clean.
  const load = await loadProject(dir);
  const doc = load.documents.find((d) => d.id === 'WO-001');
  assert.equal(doc?.status, 'in-progress');
  assert.equal(doc?.approved, '2026-08-11');
  assert.equal(doc?.claimedBy, 'agent-42');
  assert.equal(doc?.claimedAt, '2026-08-11');
  const issues = checkProject(load).issues.filter((issue) => 'file' in issue && issue.file !== 'requirements/REQ-002-broken-draft.md');
  assert.deepEqual(issues, []);
});

test('a pre-existing stamp is preserved, never re-dated — dispatch spends it and writes only the claim', async (t) => {
  // The migrated ready queue's transitional state (DEC-143): backlog with a
  // stamp is clearance granted but not yet spent. Dispatching it must not
  // rewrite the recorded judgment date.
  const dir = sandbox(t);
  await ratified(dir);
  const file = join(dir, 'work-orders/WO-001-not-approvable.md');
  writeFileSync(
    file,
    readFileSync(file, 'utf8').replace(/^status: backlog$/m, 'status: backlog\napproved: 2026-08-01'),
  );

  const result = await dispatchWorkOrder(dir, 'WO-001', 'agent-42', { date: '2026-08-11' });
  assert.equal(result.stamped, false);
  assert.equal(result.approved, '2026-08-01');
  const after = readFileSync(file, 'utf8');
  assert.match(after, /^approved: 2026-08-01$/m);
  assert.doesNotMatch(after, /^approved: 2026-08-11$/m);
  assert.match(after, /^claimed_by: agent-42\nclaimed_at: 2026-08-11$/m);
});

test('the prospective gates: pending links, no requirement link, and a dead trace each refuse the gesture', async (t) => {
  const dir = sandbox(t);
  // REQ-001 is still draft — dispatch would be clearance over unratified spec.
  await assert.rejects(
    () => dispatchWorkOrder(dir, 'WO-001', 'agent-42'),
    /refusing to dispatch WO-001 — it depends on REQ-001, which is still draft/,
  );
  assert.match(readFileSync(join(dir, 'work-orders/WO-001-not-approvable.md'), 'utf8'), /^status: backlog$/m);

  // The trace reaches nothing live once the only requirement retires.
  await ratified(dir);
  const reqFile = join(dir, 'requirements/REQ-001-clean-draft.md');
  const accepted = readFileSync(reqFile, 'utf8');
  writeFileSync(reqFile, accepted.replace('status: accepted', 'status: retired'));
  await assert.rejects(
    () => dispatchWorkOrder(dir, 'WO-001', 'agent-42'),
    /refusing to dispatch WO-001 — it traces to no live requirement/,
  );
  writeFileSync(reqFile, accepted);

  // No requirement link at all is the direct-link rule's case.
  const woFile = join(dir, 'work-orders/WO-001-not-approvable.md');
  writeFileSync(woFile, readFileSync(woFile, 'utf8').replace(/links:\n(?:  .*\n)+/, ''));
  await assert.rejects(
    () => dispatchWorkOrder(dir, 'WO-001', 'agent-42'),
    /refusing to dispatch WO-001 — it links no requirement/,
  );
});

test('only backlog dispatches: a claimed work order names its holder, done has nothing to dispatch', async (t) => {
  const dir = sandbox(t);
  await ratified(dir);
  await dispatchWorkOrder(dir, 'WO-001', 'agent-42', { date: '2026-08-11' });
  await assert.rejects(
    () => dispatchWorkOrder(dir, 'WO-001', 'agent-43'),
    /refusing to dispatch WO-001 — it is already in-progress, claimed by "agent-42" since 2026-08-11/,
  );
  const file = join(dir, 'work-orders/WO-001-not-approvable.md');
  writeFileSync(file, readFileSync(file, 'utf8').replace('status: in-progress', 'status: done'));
  await assert.rejects(() => dispatchWorkOrder(dir, 'WO-001', 'agent-43'), /nothing to dispatch — WO-001 is done/);
});

test('dispatch refuses non-work-orders, unknown ids, empty claimants, and non-date dates', async (t) => {
  const dir = sandbox(t);
  await ratified(dir);
  await assert.rejects(() => dispatchWorkOrder(dir, 'REQ-001', 'agent-42'), /is a requirement — only work orders are dispatched/);
  await assert.rejects(() => dispatchWorkOrder(dir, 'WO-999', 'agent-42'), /no document with id WO-999/);
  await assert.rejects(() => dispatchWorkOrder(dir, 'WO-001', '   '), /a claim names its holder/);
  await assert.rejects(() => dispatchWorkOrder(dir, 'WO-001', 'agent-42', { date: 'yesterday' }), /dispatch date must be YYYY-MM-DD/);
});

test('in a maintainers project the stamp half must name a listed maintainer (DEC-071)', async (t) => {
  const dir = sandbox(t);
  await ratified(dir);
  const wf = join(dir, 'workflow.md');
  writeFileSync(wf, readFileSync(wf, 'utf8').replace(/^status: /m, 'maintainers:\n  - Ada\n  - Grace\nstatus: '));

  await assert.rejects(
    () => dispatchWorkOrder(dir, 'WO-001', 'agent-42'),
    /the stamp must name one: veri dispatch WO-001 --as <session> --by <name>.*Ada, Grace/s,
  );
  await assert.rejects(
    () => dispatchWorkOrder(dir, 'WO-001', 'agent-42', { approvedBy: 'Mallory' }),
    /"Mallory" is not in the workflow's maintainers list/,
  );

  const result = await dispatchWorkOrder(dir, 'WO-001', 'agent-42', { approvedBy: 'Grace', date: '2026-08-11' });
  assert.equal(result.approvedBy, 'Grace');
  const raw = readFileSync(join(dir, result.file), 'utf8');
  // The name rides directly under the date, the approve-edit order (DEC-071).
  assert.match(raw, /^approved: 2026-08-11\napproved_by: Grace\nclaimed_by: agent-42$/m);
});

test('an unmet design gate blocks the gesture prospectively (DEC-143)', async (t) => {
  const dir = sandbox(t);
  await ratified(dir);
  const wf = join(dir, 'workflow.md');
  writeFileSync(wf, readFileSync(wf, 'utf8').replace(/^status: /m, 'design_gate_paths:\n  - packages/ui\nstatus: '));
  const woFile = join(dir, 'work-orders/WO-001-not-approvable.md');
  writeFileSync(
    woFile,
    readFileSync(woFile, 'utf8').replace(/^links:$/m, 'binds:\n  paths:\n    - packages/ui/src/**\nlinks:'),
  );
  await assert.rejects(
    () => dispatchWorkOrder(dir, 'WO-001', 'agent-42'),
    /refusing to dispatch WO-001 — work order WO-001 declares design-gated packages\/ui/,
  );
  // The backlog exemption means the gate was invisible to the plain check —
  // the refusal is dispatch's own prospective look.
  assert.match(readFileSync(woFile, 'utf8'), /^status: backlog$/m);
});
