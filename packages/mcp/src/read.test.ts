import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getDocument, getNeighbors } from './read.ts';

function doc(id: string, type: string, title: string, status: string, extra: string[] = [], body = 'Body.'): string {
  return [
    '---',
    `id: ${id}`,
    `type: ${type}`,
    `title: ${title}`,
    `status: ${status}`,
    'created: 2026-08-01',
    'updated: 2026-08-01',
    ...extra,
    '---',
    '',
    body,
    '',
  ].join('\n');
}

/** REQ-001 ← DEC-001 (constrains, frontmatter) and ← WO-001 (implements + inline mention). */
function sandbox(t: { after(fn: () => void): void }): string {
  const root = mkdtempSync(join(tmpdir(), 'veri-mcp-read-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const sub of ['requirements', 'decisions', 'work-orders']) {
    mkdirSync(join(root, 'veri', sub), { recursive: true });
  }
  writeFileSync(join(root, 'veri/requirements/REQ-001-base.md'), doc('REQ-001', 'requirement', 'Base', 'accepted', ['approved: 2026-08-01']));
  writeFileSync(
    join(root, 'veri/decisions/DEC-001-choice.md'),
    doc('DEC-001', 'decision', 'Choice', 'active', ['approved: 2026-08-01', 'links:', '  - id: REQ-001', '    rel: constrains']),
  );
  writeFileSync(
    join(root, 'veri/work-orders/WO-001-work.md'),
    doc(
      'WO-001',
      'work-order',
      'Work',
      'backlog',
      ['links:', '  - id: REQ-001', '    rel: implements', '  - id: REQ-999', '    rel: blocked-by'],
      'Per [[REQ-001]] and [[DEC-001]].',
    ),
  );
  return root;
}

test('get_document returns the file exactly as on disk, with its path', async (t) => {
  const root = sandbox(t);
  const result = await getDocument(root, 'REQ-001');
  assert.equal(result.file, 'veri/requirements/REQ-001-base.md');
  assert.equal(result.text, readFileSync(join(root, result.file), 'utf8'));
  assert.match(result.text, /^---\nid: REQ-001\n/);
});

test('get_document rejects an unknown id', async (t) => {
  const root = sandbox(t);
  await assert.rejects(() => getDocument(root, 'REQ-042'), /no document with id REQ-042/);
});

test('get_neighbors returns backlinks with rels from frontmatter and inline mentions', async (t) => {
  const root = sandbox(t);
  const hood = await getNeighbors(root, 'REQ-001');
  assert.equal(hood.outgoing.length, 0);
  const byKey = (edge: { id: string; rel: string }): string => `${edge.id}:${edge.rel}`;
  assert.deepEqual(hood.backlinks.map(byKey).sort(), ['DEC-001:constrains', 'WO-001:implements', 'WO-001:mentions']);
  const implement = hood.backlinks.find((edge) => edge.rel === 'implements');
  assert.equal(implement?.via, 'frontmatter');
  const mention = hood.backlinks.find((edge) => edge.rel === 'mentions');
  assert.equal(mention?.via, 'inline');
});

test('get_neighbors describes outbound targets and marks broken links', async (t) => {
  const root = sandbox(t);
  const hood = await getNeighbors(root, 'WO-001');
  const real = hood.outgoing.find((edge) => edge.id === 'REQ-001' && edge.rel === 'implements');
  assert.deepEqual(
    { title: real?.title, type: real?.type, status: real?.status },
    { title: 'Base', type: 'requirement', status: 'accepted' },
  );
  const broken = hood.outgoing.find((edge) => edge.id === 'REQ-999');
  assert.equal(broken?.title, null); // broken link: named, never invented
});

test('get_neighbors rejects an unknown id', async (t) => {
  const root = sandbox(t);
  await assert.rejects(() => getNeighbors(root, 'WO-999'), /no document with id WO-999/);
});
