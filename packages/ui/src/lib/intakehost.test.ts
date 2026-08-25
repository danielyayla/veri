import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadProject, scaffoldProject } from '@verikb/core';
import { commitIntake, inspectIntake } from './intakehost.ts';

/**
 * WO-096 — the app's intake host. Inspect must be side-effect free (Cancel
 * files nothing), commit must file check-passing sources with originals
 * preserved, allocating ids at write time.
 */

function sandbox(t: { after: (fn: () => void) => void }): string {
  const dir = mkdtempSync(join(tmpdir(), 'veri-intakehost-'));
  scaffoldProject(dir);
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

test('inspect derives rows for supported files and refusals for the rest, writing nothing', (t) => {
  const root = sandbox(t);
  writeFileSync(join(root, 'notes.md'), '# Kickoff notes\n\nBody.\n');
  writeFileSync(join(root, 'scan.pdf'), Buffer.from([0x25, 0x50, 0x44, 0x46]));

  const rows = inspectIntake([join(root, 'notes.md'), join(root, 'scan.pdf'), join(root, 'gone.txt')]);
  assert.equal(rows.length, 3);
  assert.deepEqual(
    rows.map((r) => r.ok),
    [true, false, false],
  );
  assert.equal(rows[0].title, 'Kickoff notes');
  assert.equal(rows[0].kind, 'md');
  assert.ok(rows[0].size > 0);
  assert.match(rows[1].message ?? '', /supported formats: \.md \.txt \.eml/);
  assert.match(rows[2].message ?? '', /cannot read gone\.txt/);

  assert.ok(!existsSync(join(root, 'veri/originals')), 'inspect must write nothing');
});

test('commit files sources with originals, allocating sequential ids at write time', async (t) => {
  const root = sandbox(t);
  writeFileSync(join(root, 'interview.md'), '# Meridian interview\n\nTranscript.\n');
  writeFileSync(join(root, 'thread.eml'), ['From: ops@example.com', 'Subject: Renewal', '', 'Body.'].join('\r\n'));

  const committed = await commitIntake(root, [
    { path: join(root, 'interview.md'), title: '' },
    { path: join(root, 'thread.eml'), title: 'Pricing thread — Meridian renewal' },
  ]);
  assert.deepEqual(
    committed.map((c) => c.id),
    ['SRC-001', 'SRC-002'],
  );
  assert.equal(committed[0].title, 'Meridian interview', 'blank sheet title falls back to the derived one');
  assert.equal(committed[1].title, 'Pricing thread — Meridian renewal');

  const doc = readFileSync(join(root, 'veri', committed[1].file), 'utf8');
  assert.match(doc, /^title: "Pricing thread — Meridian renewal"$/m);
  assert.match(doc, /^original: "originals\/SRC-002-thread\.eml"$/m);
  assert.ok(existsSync(join(root, 'veri', committed[0].original)));

  const { documents, issues } = await loadProject(join(root, 'veri'));
  assert.equal(issues.length, 0, JSON.stringify(issues));
  assert.equal(documents.filter((d) => d.frontmatter.type === 'source').length, 2);
});

test('commit throws on a refused file without touching later rows or the id store', async (t) => {
  const root = sandbox(t);
  writeFileSync(join(root, 'scan.pdf'), Buffer.from([0x25, 0x50]));
  writeFileSync(join(root, 'ok.txt'), 'text\n');

  await assert.rejects(
    () =>
      commitIntake(root, [
        { path: join(root, 'scan.pdf'), title: '' },
        { path: join(root, 'ok.txt'), title: '' },
      ]),
    /supported formats/,
  );
  const { documents } = await loadProject(join(root, 'veri'));
  assert.equal(documents.filter((d) => d.frontmatter.type === 'source').length, 0, 'nothing files when the batch leads with a refusal');
});
