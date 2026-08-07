import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { appendNote, setStatus } from './write.ts';

const WO_FILE = [
  '---',
  'id: WO-001',
  'type: work-order',
  'title: Build it',
  'status: backlog',
  'created: 2026-08-01',
  'updated: 2026-08-01',
  'links:',
  '  - id: REQ-001',
  '    rel: delivers',
  '---',
  '',
  '## Summary',
  '',
  'Do the thing.',
  '',
  '## Receipts',
  '',
  '- 2026-08-05 — abc1234 — src/a.ts — did the thing',
  '',
].join('\n');

async function makeProject(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'veri-ui-'));
  await mkdir(join(root, 'veri', 'work-orders'), { recursive: true });
  await mkdir(join(root, 'veri', 'requirements'), { recursive: true });
  await writeFile(join(root, 'veri', 'work-orders', 'WO-001-build-it.md'), WO_FILE);
  return root;
}

test('setStatus rewrites only the status and updated lines', async () => {
  const root = await makeProject();
  await setStatus(root, 'WO-001', 'in-progress');
  const after = await readFile(join(root, 'veri', 'work-orders', 'WO-001-build-it.md'), 'utf8');
  const today = new Date().toISOString().slice(0, 10);
  const changed = WO_FILE.split('\n')
    .map((line) => {
      if (line === 'status: backlog') return 'status: in-progress';
      if (line === 'updated: 2026-08-01') return `updated: ${today}`;
      return line;
    })
    .join('\n');
  assert.equal(after, changed);
});

test('setStatus rejects a status outside the type vocabulary', async () => {
  const root = await makeProject();
  await assert.rejects(() => setStatus(root, 'WO-001', 'accepted'), /not a valid work-order status/);
});

test('appendNote creates a Notes section and stamps updated', async () => {
  const root = await makeProject();
  await appendNote(root, 'WO-001', 'Linked [[REQ-001]] for context');
  const after = await readFile(join(root, 'veri', 'work-orders', 'WO-001-build-it.md'), 'utf8');
  const today = new Date().toISOString().slice(0, 10);
  assert.ok(after.includes(`## Notes\n\n- ${today} — Linked [[REQ-001]] for context`));
  assert.ok(after.includes(`updated: ${today}`));
  // The receipts section is untouched.
  assert.ok(after.includes('- 2026-08-05 — abc1234 — src/a.ts — did the thing'));
});

test('appendNote appends to an existing Notes section without clobbering', async () => {
  const root = await makeProject();
  await appendNote(root, 'WO-001', 'first');
  await appendNote(root, 'WO-001', 'second');
  const after = await readFile(join(root, 'veri', 'work-orders', 'WO-001-build-it.md'), 'utf8');
  const today = new Date().toISOString().slice(0, 10);
  assert.ok(after.includes(`- ${today} — first\n- ${today} — second`));
  assert.equal(after.match(/## Notes/g)!.length, 1);
});
