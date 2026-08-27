import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { z } from 'zod';
import { frontmatterSchema, isPending, loadProject, nextDispatchable } from '@verikb/core';
import { DOCUMENT_STATUSES, getQueue, listDocuments, renderDocuments, renderQueue } from './enumerate.ts';

function doc(id: string, type: string, title: string, status: string, updated: string, extra: string[] = []): string {
  return ['---', `id: ${id}`, `type: ${type}`, `title: ${title}`, `status: ${status}`, 'created: 2026-08-01', `updated: ${updated}`, ...extra, '---', '', 'Body.', ''].join('\n');
}

const APPROVED = ['approved: 2026-08-01'];
const IMPLEMENTS = ['links:', '  - id: REQ-001', '    rel: implements'];

/**
 * A corpus spanning the lifecycle: two requirements (one accepted, one still
 * draft), a proposed decision, a withdrawn source, and five work orders —
 * backlog, two ready (filed out of order), one in-progress with a claim, one
 * done.
 */
function sandbox(t: { after(fn: () => void): void }): string {
  const root = mkdtempSync(join(tmpdir(), 'veri-mcp-enumerate-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const sub of ['requirements', 'decisions', 'work-orders', 'sources']) {
    mkdirSync(join(root, 'veri', sub), { recursive: true });
  }
  const write = (sub: string, name: string, text: string): void => writeFileSync(join(root, 'veri', sub, name), text);

  write('requirements', 'REQ-001-live.md', doc('REQ-001', 'requirement', 'Live canon', 'accepted', '2026-01-05', APPROVED));
  write('requirements', 'REQ-002-drafted.md', doc('REQ-002', 'requirement', 'Drafted canon', 'draft', '2026-08-20'));
  write('decisions', 'DEC-001-proposed.md', doc('DEC-001', 'decision', 'Proposed choice', 'proposed', '2026-08-20'));
  write('sources', 'SRC-001-gone.md', doc('SRC-001', 'source', 'Retracted evidence', 'withdrawn', '2026-01-05'));
  write('work-orders', 'WO-001-sketch.md', doc('WO-001', 'work-order', 'Sketch', 'backlog', '2026-01-05', IMPLEMENTS));
  write('work-orders', 'WO-010-second.md', doc('WO-010', 'work-order', 'Second ready', 'ready', '2026-08-20', [...APPROVED, ...IMPLEMENTS]));
  write('work-orders', 'WO-002-head.md', doc('WO-002', 'work-order', 'First ready', 'ready', '2026-08-20', [...APPROVED, ...IMPLEMENTS]));
  write(
    'work-orders',
    'WO-003-held.md',
    doc('WO-003', 'work-order', 'Held', 'in-progress', '2026-08-25', [...APPROVED, 'claimed_by: session-alpha', 'claimed_at: 2026-08-25', ...IMPLEMENTS]),
  );
  write('work-orders', 'WO-004-shipped.md', doc('WO-004', 'work-order', 'Shipped', 'done', '2026-01-05', [...APPROVED, ...IMPLEMENTS]));
  return root;
}

const ids = (rows: Array<{ id: string }>): string[] => rows.map((entry) => entry.id);

test('list_documents with no filters returns every non-withdrawn document in id order', async (t) => {
  const root = sandbox(t);
  const rows = await listDocuments(root);
  assert.deepEqual(ids(rows), ['DEC-001', 'REQ-001', 'REQ-002', 'WO-001', 'WO-002', 'WO-003', 'WO-004', 'WO-010']);
  // Withdrawn is out of play (DEC-110) and never appears unasked…
  assert.ok(!ids(rows).includes('SRC-001'));
  // …and each row carries what a skill needs to decide whether to open it.
  assert.deepEqual(rows.find((entry) => entry.id === 'REQ-002'), {
    id: 'REQ-002',
    title: 'Drafted canon',
    type: 'requirement',
    status: 'draft',
    updated: '2026-08-20',
    file: 'veri/requirements/REQ-002-drafted.md',
    pending: true,
  });
});

test('list_documents orders ids numerically, not lexically', async (t) => {
  const rows = await listDocuments(sandbox(t), { type: 'work-order' });
  // WO-010 last, not between WO-001 and WO-002 (compareIds, WO-050).
  assert.deepEqual(ids(rows), ['WO-001', 'WO-002', 'WO-003', 'WO-004', 'WO-010']);
});

test('each list_documents filter narrows, and the filters combine', async (t) => {
  const root = sandbox(t);
  assert.deepEqual(ids(await listDocuments(root, { type: 'requirement' })), ['REQ-001', 'REQ-002']);
  assert.deepEqual(ids(await listDocuments(root, { status: 'ready' })), ['WO-002', 'WO-010']);
  // Strictly before the cutoff: 2026-08-20 excludes documents updated that day.
  assert.deepEqual(ids(await listDocuments(root, { updatedBefore: '2026-08-20' })), ['REQ-001', 'WO-001', 'WO-004']);
  assert.deepEqual(ids(await listDocuments(root, { type: 'work-order', updatedBefore: '2026-08-20' })), ['WO-001', 'WO-004']);
  assert.deepEqual(ids(await listDocuments(root, { type: 'work-order', status: 'ready', updatedBefore: '2026-08-21' })), ['WO-002', 'WO-010']);
});

test('list_documents surfaces withdrawn documents only when asked for by status', async (t) => {
  const root = sandbox(t);
  assert.deepEqual(ids(await listDocuments(root, { status: 'withdrawn' })), ['SRC-001']);
  assert.deepEqual(await listDocuments(root, { type: 'source' }), []);
});

test('list_documents returns the empty set rather than everything when nothing matches', async (t) => {
  const root = sandbox(t);
  assert.deepEqual(await listDocuments(root, { status: 'retired' }), []);
  assert.deepEqual(await listDocuments(root, { type: 'requirement', status: 'ready' }), []);
  assert.deepEqual(await listDocuments(root, { updatedBefore: '2020-01-01' }), []);
  assert.equal(renderDocuments([]), 'no documents match');
});

test('draft and proposed together enumerate exactly the set isPending identifies (REQ-008)', async (t) => {
  const root = sandbox(t);
  const enumerated = [...ids(await listDocuments(root, { status: 'draft' })), ...ids(await listDocuments(root, { status: 'proposed' }))].sort();
  const { documents } = await loadProject(join(root, 'veri'));
  assert.deepEqual(
    enumerated,
    documents
      .filter(isPending)
      .map((document) => document.id)
      .sort(),
  );
  assert.deepEqual(enumerated, ['DEC-001', 'REQ-002']);
});

test('list_documents refuses a project with no veri/ directory', async (t) => {
  const root = mkdtempSync(join(tmpdir(), 'veri-mcp-empty-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  await assert.rejects(listDocuments(root), /no veri\/ directory/);
  await assert.rejects(getQueue(root), /no veri\/ directory/);
});

test('get_queue lists ready work orders in dispatch order, head first', async (t) => {
  const root = sandbox(t);
  const queue = await getQueue(root);
  assert.deepEqual(ids(queue.ready), ['WO-002', 'WO-010']);
  // The head is the id `veri next` prints — one evaluation site (WO-098).
  const { documents } = await loadProject(join(root, 'veri'));
  assert.equal(queue.ready[0]?.id, nextDispatchable(documents)?.id);
  assert.equal(queue.ready[0]?.title, 'First ready');
  assert.equal(queue.ready[0]?.file, 'veri/work-orders/WO-002-head.md');
  // Backlog and done are not dispatchable and never appear.
  assert.ok(!ids(queue.ready).some((id) => ['WO-001', 'WO-004'].includes(id)));
});

test('get_queue reports in-progress work orders with their claim holder and date', async (t) => {
  const queue = await getQueue(sandbox(t));
  assert.deepEqual(queue.inProgress.map((entry) => [entry.id, entry.claimedBy, entry.claimedAt]), [['WO-003', 'session-alpha', '2026-08-25']]);
  assert.equal(queue.inProgress[0]?.title, 'Held');
});

test('get_queue on a corpus with nothing ready and nothing claimed says so', async (t) => {
  const root = mkdtempSync(join(tmpdir(), 'veri-mcp-queue-empty-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'veri', 'work-orders'), { recursive: true });
  writeFileSync(join(root, 'veri', 'work-orders', 'WO-001-sketch.md'), doc('WO-001', 'work-order', 'Sketch', 'backlog', '2026-01-05'));
  const queue = await getQueue(root);
  assert.deepEqual(queue, { ready: [], inProgress: [] });
  const text = renderQueue(queue);
  assert.match(text, /Ready \(0\) — nothing is ready to start/);
  assert.match(text, /In progress \(0\)/);
});

test('the rendered queue puts the head first and names each claim', async (t) => {
  const text = renderQueue(await getQueue(sandbox(t)));
  const lines = text.split('\n');
  assert.equal(lines[0], 'Ready (2) — dispatch order, head first:');
  assert.equal(lines[1], 'WO-002  veri/work-orders/WO-002-head.md  First ready');
  assert.equal(lines[2], 'WO-010  veri/work-orders/WO-010-second.md  Second ready');
  assert.match(text, /^WO-003 {2}claimed by session-alpha since 2026-08-25 {2}veri\/work-orders\/WO-003-held\.md {2}Held$/m);
});

test('the rendered document list carries every field, pending marked, title last', async (t) => {
  const text = renderDocuments(await listDocuments(sandbox(t), { type: 'requirement' }));
  assert.equal(
    text,
    [
      '2 documents:',
      'REQ-001  requirement  accepted  updated 2026-01-05  veri/requirements/REQ-001-live.md  Live canon',
      'REQ-002  requirement  draft (pending)  updated 2026-08-20  veri/requirements/REQ-002-drafted.md  Drafted canon',
    ].join('\n'),
  );
});

// The status vocabulary this surface advertises is core's, restated so the
// tool can refuse a typo. Restated knowledge drifts, so the drift is a test
// failure: every status any document type accepts must be listable.
test('DOCUMENT_STATUSES covers every status core’s frontmatter schema accepts', () => {
  const union = frontmatterSchema instanceof z.ZodEffects ? frontmatterSchema.innerType() : frontmatterSchema;
  assert.ok(union instanceof z.ZodDiscriminatedUnion, 'expected a discriminated union over document types');
  const fromCore = new Set<string>();
  for (const option of union.options as z.ZodObject<{ status: z.ZodEnum<[string, ...string[]]> }>[]) {
    for (const status of option.shape.status.options) fromCore.add(status);
  }
  assert.deepEqual([...fromCore].sort(), [...DOCUMENT_STATUSES].sort());
});
