import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkProject, loadProject } from '@veri/core';
import { fileDecision, fileReceipt } from './writeback.ts';
import { searchDocs } from './search.ts';

const FIXTURE = fileURLToPath(new URL('../fixtures/writeback', import.meta.url));

function sandbox(t: { after(fn: () => void): void }): string {
  const dir = mkdtempSync(join(tmpdir(), 'veri-mcp-test-'));
  cpSync(FIXTURE, dir, { recursive: true });
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

async function assertClean(root: string): Promise<void> {
  const load = await loadProject(join(root, 'veri'));
  assert.deepEqual(checkProject(load).issues, []);
}

test('file_decision creates a valid decision with the next free DEC id', async (t) => {
  const root = sandbox(t);
  const first = await fileDecision(root, {
    title: 'Use widgets',
    choice: 'Widgets over gadgets.',
    rejected_alternatives: '- **Gadgets** — too fiddly',
    rationale: 'Widgets are boring and reliable.',
    links: [{ id: 'WO-001', rel: 'constrains' }],
  });
  assert.equal(first.id, 'DEC-001');
  await assertClean(root);

  const content = readFileSync(join(root, first.file), 'utf8');
  assert.match(content, /^status: proposed$/m); // born unapproved — REQ-008
  assert.doesNotMatch(content, /^approved:/m);
  assert.match(content, /## Choice/);
  assert.match(content, /## Rejected alternatives/);

  const second = await fileDecision(root, { title: 'Another one', choice: 'X.' });
  assert.equal(second.id, 'DEC-002');
  await assertClean(root);

  const hits = await searchDocs(root, 'widgets');
  assert.ok(hits.some((hit) => hit.id === 'DEC-001' && hit.status === 'proposed'));
});

test('file_decision consumes ids permanently via the shared record', async (t) => {
  const root = sandbox(t);
  const first = await fileDecision(root, { title: 'Ephemeral', choice: 'X.' });
  assert.equal(first.id, 'DEC-001');
  assert.match(readFileSync(join(root, 'veri', 'ids'), 'utf8'), /^DEC 1$/m);

  rmSync(join(root, first.file));
  const second = await fileDecision(root, { title: 'Successor', choice: 'Y.' });
  assert.equal(second.id, 'DEC-002'); // DEC-001 is spent, deleted or not
  await assertClean(root);
});

test('file_decision rejects links to nonexistent documents', async (t) => {
  const root = sandbox(t);
  await assert.rejects(
    () => fileDecision(root, { title: 'Bad', choice: 'X.', links: [{ id: 'REQ-999', rel: 'constrains' }] }),
    /REQ-999 does not exist/,
  );
});

test('file_receipt replaces the placeholder and a second call appends without clobbering', async (t) => {
  const root = sandbox(t);
  await fileReceipt(root, {
    work_order_id: 'WO-001',
    commit: 'abc1234',
    files: 'src/a.ts',
    summary: 'first session',
    date: '2026-08-05',
  });
  let content = readFileSync(join(root, 'veri/work-orders/WO-001-with-placeholder.md'), 'utf8');
  assert.ok(!content.includes('(none yet)'), 'placeholder must be removed');
  assert.match(content, /- 2026-08-05 — abc1234 — src\/a\.ts — first session/);

  await fileReceipt(root, {
    work_order_id: 'WO-001',
    commit: 'def5678',
    files: 'src/b.ts',
    summary: 'second session',
    date: '2026-08-06',
  });
  content = readFileSync(join(root, 'veri/work-orders/WO-001-with-placeholder.md'), 'utf8');
  assert.match(content, /abc1234[\s\S]*def5678/, 'both receipts present, in order');
  assert.match(content, /^updated: \d{4}-\d{2}-\d{2}$/m);
  await assertClean(root);

  const { documents } = await loadProject(join(root, 'veri'));
  const workOrder = documents.find((doc) => doc.id === 'WO-001');
  assert.ok(workOrder, 'WO-001 should still load');
});

test('file_receipt creates the Receipts section when missing', async (t) => {
  const root = sandbox(t);
  await fileReceipt(root, { work_order_id: 'WO-002', commit: 'abc1234', files: 'x.ts', summary: 'session' });
  const content = readFileSync(join(root, 'veri/work-orders/WO-002-no-receipts-section.md'), 'utf8');
  assert.match(content, /## Receipts\n\n- \d{4}-\d{2}-\d{2} — abc1234 — x\.ts — session/);
  await assertClean(root);
});

test('file_receipt rejects unknown and non-work-order ids', async (t) => {
  const root = sandbox(t);
  const receipt = { commit: 'a', files: 'b', summary: 'c' };
  await assert.rejects(() => fileReceipt(root, { work_order_id: 'WO-999', ...receipt }), /no document/);
  await assert.rejects(() => fileReceipt(root, { work_order_id: 'REQ-001', ...receipt }), /expects a work order/);
});
