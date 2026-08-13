import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createDocument, slugifyTitle } from './create.ts';
import { loadProject } from './load.ts';
import { checkProject } from './check.ts';

function sandbox(t: { after(fn: () => void): void }): string {
  const dir = mkdtempSync(join(tmpdir(), 'veri-create-test-'));
  for (const sub of ['requirements', 'decisions', 'work-orders', 'sources']) {
    mkdirSync(join(dir, sub), { recursive: true });
  }
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

test('every document type scaffolds a file that passes veri check untouched', async (t) => {
  const dir = sandbox(t);
  const cases = [
    ['requirement', 'REQ-001', 'requirements', 'draft'],
    ['decision', 'DEC-001', 'decisions', 'proposed'],
    ['work-order', 'WO-001', 'work-orders', 'backlog'],
    ['source', 'SRC-001', 'sources', 'imported'],
  ] as const;
  for (const [type, id, subdir, status] of cases) {
    const result = await createDocument(dir, type, `A new ${type}`, '2026-08-12');
    assert.equal(result.id, id);
    assert.ok(result.file.startsWith(`${subdir}/`), `${result.file} should live in ${subdir}/`);
    const raw = readFileSync(join(dir, result.file), 'utf8');
    assert.equal(raw, result.text);
    assert.match(raw, new RegExp(`^status: ${status}$`, 'm'));
    assert.match(raw, /^created: 2026-08-12$/m);
  }
  const load = await loadProject(dir);
  assert.equal(load.documents.length, 4);
  // A fresh WO with no linked requirement is fine in backlog; zero issues —
  // and zero advisories: template-born documents match their own structure (DEC-025).
  assert.deepEqual(checkProject(load), { issues: [], advisories: [] });
});

test('ids advance past the highest taken id and titles are slugged into filenames', async (t) => {
  const dir = sandbox(t);
  writeFileSync(
    join(dir, 'requirements/REQ-007-existing.md'),
    '---\nid: REQ-007\ntype: requirement\ntitle: Existing\nstatus: draft\ncreated: 2026-08-01\nupdated: 2026-08-01\nlinks: []\n---\n\nBody.\n',
  );
  const result = await createDocument(dir, 'requirement', 'Fancy Title: With (Punctuation)!', '2026-08-12');
  assert.equal(result.id, 'REQ-008');
  assert.equal(result.file, 'requirements/REQ-008-fancy-title-with-punctuation.md');
});

test('a blank title is refused', async (t) => {
  const dir = sandbox(t);
  await assert.rejects(createDocument(dir, 'requirement', '   '), /title is required/);
});

test('slugifyTitle handles hostile input', () => {
  assert.equal(slugifyTitle('  ---  '), 'untitled');
  assert.equal(slugifyTitle('ALL CAPS AND    SPACES'), 'all-caps-and-spaces');
  assert.equal(slugifyTitle('x'.repeat(100)).length <= 60, true);
});
