import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkProject, loadProject, localToday } from '@verikb/core';
import { amendDocument } from './amend.ts';
import { fileReceipt, fileSource, fileWorkOrder } from './writeback.ts';

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

test('amend revises title, body, and links of a backlog work order in one call', async (t) => {
  const root = sandbox(t);
  const result = await amendDocument(root, {
    id: 'WO-001',
    title: 'Work order, re-scoped after review',
    body: '## Summary\n\nRevised after feedback.\n\n## In scope\n\n- The narrower thing\n\n## Acceptance tests\n\n- [ ] Narrower thing works',
    links: [{ id: 'REQ-001', rel: 'implements' }],
  });
  assert.equal(result.id, 'WO-001');
  await assertClean(root);

  const content = readFileSync(join(root, result.file), 'utf8');
  assert.match(content, /^title: "Work order, re-scoped after review"$/m);
  assert.match(content, /^status: backlog$/m); // never a promotion
  assert.doesNotMatch(content, /^approved:/m);
  assert.match(content, /^created: 2026-08-01$/m); // untouched
  assert.match(content, new RegExp(`^updated: ${localToday()}$`, 'm'));
  assert.match(content, /^ {2}- id: REQ-001\n {4}rel: implements$/m);
  assert.match(content, /## In scope\n\n- The narrower thing/);
  assert.match(content, /## Receipts\n\n\(none yet\)/); // carried over verbatim
});

test('amend preserves filed receipts across a body replacement', async (t) => {
  const root = sandbox(t);
  await fileReceipt(root, { work_order_id: 'WO-001', commit: 'abc1234', files: 'a.ts', summary: 'First pass.' });
  await amendDocument(root, { id: 'WO-001', body: '## Summary\n\nRevised.' });
  const content = readFileSync(join(root, 'veri/work-orders/WO-001-with-placeholder.md'), 'utf8');
  assert.match(content, /## Summary\n\nRevised\./);
  assert.match(content, /## Receipts\n\n- \d{4}-\d{2}-\d{2} — abc1234 — a\.ts — First pass\./);
  await assertClean(root);
});

test('amend refuses a body that carries its own Receipts section', async (t) => {
  const root = sandbox(t);
  await assert.rejects(
    amendDocument(root, { id: 'WO-001', body: '## Summary\n\nX.\n\n## Receipts\n\n- forged' }),
    /append-only via file_receipt/,
  );
});

test('amend refuses approved documents, naming the approval boundary', async (t) => {
  const root = sandbox(t);
  await assert.rejects(amendDocument(root, { id: 'REQ-001', title: 'Rewritten' }), /approval boundary \(REQ-008\)/);
  const content = readFileSync(join(root, 'veri/requirements/REQ-001-base.md'), 'utf8');
  assert.match(content, /^title: Base requirement$/m); // untouched
});

test('amend refuses sources — preserved evidence is never rewritten', async (t) => {
  const root = sandbox(t);
  const src = await fileSource(root, { title: 'Some evidence', body: 'Verbatim.' });
  await assert.rejects(amendDocument(root, { id: src.id, body: 'Reworded.' }), /preserved evidence/);
});

test('amend refuses unknown ids, unknown link targets, and empty amendments', async (t) => {
  const root = sandbox(t);
  await assert.rejects(amendDocument(root, { id: 'WO-999', title: 'X' }), /no document with id WO-999/);
  await assert.rejects(
    amendDocument(root, { id: 'WO-001', links: [{ id: 'REQ-404', rel: 'implements' }] }),
    /link target REQ-404 does not exist/,
  );
  await assert.rejects(amendDocument(root, { id: 'WO-001' }), /nothing to amend/);
  await assert.rejects(amendDocument(root, { id: 'WO-001', title: '   ' }), /a title is required/);
});

test('amend refuses a result that would fail veri check', async (t) => {
  const root = sandbox(t);
  // A newline smuggled through a link rel would corrupt the frontmatter.
  await assert.rejects(
    amendDocument(root, { id: 'WO-001', links: [{ id: 'REQ-001', rel: 'implements\nstatus: done' }] }),
    /would fail veri check/,
  );
  const content = readFileSync(join(root, 'veri/work-orders/WO-001-with-placeholder.md'), 'utf8');
  assert.match(content, /^status: backlog$/m); // nothing written
});

test('amend links a document that had no links block, and can clear one', async (t) => {
  const root = sandbox(t);
  const filed = await fileWorkOrder(root, { title: 'Linkless proposal', summary: 'X.' });
  await amendDocument(root, { id: filed.id, links: [{ id: 'REQ-001', rel: 'implements' }] });
  let content = readFileSync(join(root, filed.file), 'utf8');
  assert.match(content, /^updated: .*\nlinks:\n {2}- id: REQ-001\n {4}rel: implements$/m);
  await assertClean(root);

  await amendDocument(root, { id: filed.id, links: [] });
  content = readFileSync(join(root, filed.file), 'utf8');
  assert.doesNotMatch(content, /^links:/m);
  await assertClean(root);
});
