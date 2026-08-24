import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { localToday } from '@veri/core';
import { appendNote, appendReviewNote, approveDoc, setLinks, setStatus } from './write.ts';

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
  const today = localToday();
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
  const today = localToday();
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
  const today = localToday();
  assert.ok(after.includes(`- ${today} — first\n- ${today} — second`));
  assert.equal(after.match(/## Notes/g)!.length, 1);
});

// ---- typed-link editing (WO-056) ----

const REQ_FILE = [
  '---',
  'id: REQ-001',
  'type: requirement',
  'title: The requirement',
  'status: draft',
  'created: 2026-08-01',
  'updated: 2026-08-01',
  '---',
  '',
  'Body.',
  '',
].join('\n');

test('setLinks rewrites only the links block and updated:, via core', async () => {
  const root = await makeProject();
  await writeFile(join(root, 'veri', 'requirements', 'REQ-001-the-requirement.md'), REQ_FILE);
  await writeFile(join(root, 'veri', 'requirements', 'REQ-002-other.md'), REQ_FILE.replace(/REQ-001/g, 'REQ-002'));
  await setLinks(root, 'WO-001', [
    { id: 'REQ-001', rel: 'delivers' },
    { id: 'REQ-002', rel: 'relates-to' },
  ]);
  const after = await readFile(join(root, 'veri', 'work-orders', 'WO-001-build-it.md'), 'utf8');
  const today = localToday();
  const changed = WO_FILE.replace(
    'links:\n  - id: REQ-001\n    rel: delivers',
    'links:\n  - id: REQ-001\n    rel: delivers\n  - id: REQ-002\n    rel: relates-to',
  ).replace('updated: 2026-08-01', `updated: ${today}`);
  assert.equal(after, changed);
});

test('setLinks refuses unknown targets and unknown documents before writing', async () => {
  const root = await makeProject();
  // REQ-001 is linked from the fixture but has no file — a hand-typed miss.
  await assert.rejects(() => setLinks(root, 'WO-001', [{ id: 'REQ-999', rel: 'relates-to' }]), /unknown link target REQ-999/);
  await assert.rejects(() => setLinks(root, 'WO-404', []), /no document with id WO-404/);
  const untouched = await readFile(join(root, 'veri', 'work-orders', 'WO-001-build-it.md'), 'utf8');
  assert.equal(untouched, WO_FILE);
});

// ---- approval gate (WO-017 / REQ-008) ----

const DRAFT_REQ = [
  '---',
  'id: REQ-001',
  'type: requirement',
  'title: Pending requirement',
  'status: draft',
  'created: 2026-08-01',
  'updated: 2026-08-01',
  '---',
  '',
  'Body text stays untouched.',
  '',
].join('\n');

async function makeReviewProject(): Promise<string> {
  const root = await makeProject();
  await writeFile(join(root, 'veri', 'requirements', 'REQ-001-pending.md'), DRAFT_REQ);
  return root;
}

test('approveDoc stamps and flips through the shared core write path', async () => {
  const root = await makeReviewProject();
  const result = await approveDoc(root, 'REQ-001');
  const today = localToday();
  assert.equal(result.from, 'draft');
  assert.equal(result.to, 'accepted');
  assert.equal(result.approved, today);
  const after = await readFile(join(root, 'veri', 'requirements', 'REQ-001-pending.md'), 'utf8');
  assert.match(after, /^status: accepted$/m);
  assert.match(after, new RegExp(`^approved: ${today}$`, 'm'));
  assert.match(after, /Body text stays untouched\./);
});

test('proposed is a writable decision status; requirements still reject it', async () => {
  const root = await makeReviewProject();
  const DEC = DRAFT_REQ.replace('id: REQ-001', 'id: DEC-001')
    .replace('type: requirement', 'type: decision')
    .replace('status: draft', 'status: active')
    .replace('title: Pending requirement', 'title: A decision');
  await mkdir(join(root, 'veri', 'decisions'), { recursive: true });
  await writeFile(join(root, 'veri', 'decisions', 'DEC-001-a-decision.md'), DEC);
  await setStatus(root, 'DEC-001', 'proposed');
  const after = await readFile(join(root, 'veri', 'decisions', 'DEC-001-a-decision.md'), 'utf8');
  assert.match(after, /^status: proposed$/m);
  await assert.rejects(() => setStatus(root, 'REQ-001', 'proposed'), /not a valid requirement status/);
});

test('appendReviewNote creates the section, appends entries, and refuses non-pending docs', async () => {
  const root = await makeReviewProject();
  const path = join(root, 'veri', 'requirements', 'REQ-001-pending.md');
  const today = localToday();

  await appendReviewNote(root, 'REQ-001', 'Tighten the wording.');
  let after = await readFile(path, 'utf8');
  assert.match(after, /## Review notes\n\n- \d{4}-\d{2}-\d{2} \(review\): Tighten the wording\.\n$/);
  assert.match(after, new RegExp(`^updated: ${today}$`, 'm'));

  await appendReviewNote(root, 'REQ-001', 'Second pass.');
  after = await readFile(path, 'utf8');
  assert.match(after, /Tighten the wording\.\n- \d{4}-\d{2}-\d{2} \(review\): Second pass\.\n$/);

  await assert.rejects(() => appendReviewNote(root, 'REQ-001', '   '), /empty/);
  await assert.rejects(() => appendReviewNote(root, 'WO-001', 'Not pending'), /review notes are for pending documents/);
});
