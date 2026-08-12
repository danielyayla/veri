import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { GuardedEditError, bumpUpdated, guardDocumentEdit, saveDocumentFile } from './save.ts';

const DOC = `---
id: REQ-001
type: requirement
title: A requirement
status: draft
created: 2026-08-01
updated: 2026-08-01
links: []
---

Body text with a [[DEC-001]] link.

## Acceptance criteria

- [ ] First criterion
`;

const APPROVED_DOC = DOC.replace('status: draft', 'status: accepted\napproved: 2026-08-02');

function edited(base: string, from: string, to: string): string {
  assert.ok(base.includes(from), `fixture must contain "${from}"`);
  return base.replace(from, to);
}

// ---- guardDocumentEdit ----

test('free edits pass: body, title, links, dates, even check-breaking ones', () => {
  assert.equal(guardDocumentEdit(DOC, edited(DOC, 'Body text', 'Rewritten body')), null);
  assert.equal(guardDocumentEdit(DOC, edited(DOC, 'title: A requirement', 'title: Renamed')), null);
  assert.equal(guardDocumentEdit(DOC, edited(DOC, 'links: []', 'links:\n  - id: DEC-001\n    rel: constrained-by')), null);
  // Deleting the acceptance criteria makes veri check unhappy, not the save.
  assert.equal(guardDocumentEdit(DOC, DOC.replace(/## Acceptance criteria[\s\S]*$/, '')), null);
});

test('changing or removing id: is rejected', () => {
  assert.equal(guardDocumentEdit(DOC, edited(DOC, 'id: REQ-001', 'id: REQ-999')), 'id is immutable');
  assert.equal(guardDocumentEdit(DOC, edited(DOC, 'id: REQ-001\n', '')), 'id is immutable');
});

test('adding, altering, or removing approved: is rejected', () => {
  assert.equal(
    guardDocumentEdit(DOC, edited(DOC, 'status: draft', 'status: draft\napproved: 2026-08-12')),
    'approved is set via veri approve',
  );
  assert.equal(
    guardDocumentEdit(APPROVED_DOC, edited(APPROVED_DOC, 'approved: 2026-08-02', 'approved: 2020-01-01')),
    'approved is set via veri approve',
  );
  assert.equal(
    guardDocumentEdit(APPROVED_DOC, edited(APPROVED_DOC, 'approved: 2026-08-02\n', '')),
    'approved is set via veri approve',
  );
});

test('promoting a pending status is rejected; demotions and lateral moves are not', () => {
  assert.equal(
    guardDocumentEdit(DOC, edited(DOC, 'status: draft', 'status: accepted')),
    'promotion requires approval — use veri approve',
  );
  const proposed = DOC.replace('id: REQ-001', 'id: DEC-001')
    .replace('type: requirement', 'type: decision')
    .replace('status: draft', 'status: proposed');
  assert.equal(
    guardDocumentEdit(proposed, edited(proposed, 'status: proposed', 'status: active')),
    'promotion requires approval — use veri approve',
  );
  // Off the pending status the gate has no say: retirement and supersession are edits.
  assert.equal(guardDocumentEdit(APPROVED_DOC, edited(APPROVED_DOC, 'status: accepted', 'status: retired')), null);
  // Work orders have no approval gate at all.
  const wo = DOC.replace('id: REQ-001', 'id: WO-001')
    .replace('type: requirement', 'type: work-order')
    .replace('status: draft', 'status: backlog');
  assert.equal(guardDocumentEdit(wo, edited(wo, 'status: backlog', 'status: in-progress')), null);
});

test('a broken frontmatter fence cannot smuggle a guarded change past the checks', () => {
  // The closing fence is gone, so the "frontmatter" degrades to the whole text.
  const broken = DOC.replace('links: []\n---', 'links: []');
  assert.equal(guardDocumentEdit(DOC, edited(broken, 'id: REQ-001', 'id: REQ-999')), 'id is immutable');
  assert.equal(guardDocumentEdit(broken, edited(broken, 'id: REQ-001', 'id: REQ-999')), 'id is immutable');
});

// ---- bumpUpdated ----

test('bumpUpdated touches only the frontmatter updated: line', () => {
  const withBodyDate = DOC + '\nupdated: not-frontmatter\n';
  const bumped = bumpUpdated(withBodyDate, '2026-08-12');
  assert.match(bumped, /^updated: 2026-08-12$/m);
  assert.ok(bumped.includes('\nupdated: not-frontmatter\n'));
  // No frontmatter block → unchanged (a check issue, not save's problem).
  assert.equal(bumpUpdated('no frontmatter here', '2026-08-12'), 'no frontmatter here');
});

// ---- saveDocumentFile ----

function sandbox(t: { after(fn: () => void): void }): string {
  const dir = mkdtempSync(join(tmpdir(), 'veri-save-test-'));
  mkdirSync(join(dir, 'requirements'), { recursive: true });
  writeFileSync(join(dir, 'requirements/REQ-001-a-requirement.md'), DOC);
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

test('save writes the buffer verbatim plus the updated: bump', async (t) => {
  const dir = sandbox(t);
  const buffer = edited(DOC, 'Body text', 'Edited body');
  const result = await saveDocumentFile(dir, 'requirements/REQ-001-a-requirement.md', buffer, '2026-08-12');
  const onDisk = readFileSync(join(dir, result.file), 'utf8');
  assert.equal(onDisk, result.text);
  assert.equal(onDisk, bumpUpdated(buffer, '2026-08-12'));
  assert.match(onDisk, /^updated: 2026-08-12$/m);
  assert.ok(onDisk.includes('Edited body'));
});

test('save rejects guarded edits against the current on-disk content', async (t) => {
  const dir = sandbox(t);
  await assert.rejects(
    saveDocumentFile(dir, 'requirements/REQ-001-a-requirement.md', edited(DOC, 'id: REQ-001', 'id: REQ-002')),
    (err: unknown) => err instanceof GuardedEditError && err.message === 'id is immutable',
  );
  // Nothing was written.
  assert.equal(readFileSync(join(dir, 'requirements/REQ-001-a-requirement.md'), 'utf8'), DOC);
});

test('saving to a missing file restores it (deleted-while-editing)', async (t) => {
  const dir = sandbox(t);
  rmSync(join(dir, 'requirements/REQ-001-a-requirement.md'));
  const result = await saveDocumentFile(dir, 'requirements/REQ-001-a-requirement.md', DOC, '2026-08-12');
  assert.equal(readFileSync(join(dir, result.file), 'utf8'), bumpUpdated(DOC, '2026-08-12'));
});

test('paths outside veri/ are refused', async (t) => {
  const dir = sandbox(t);
  for (const bad of ['../escape.md', '/tmp/abs.md', 'requirements/../../out.md', 'requirements/not-markdown.txt']) {
    await assert.rejects(saveDocumentFile(dir, bad, DOC), /refusing to write|outside veri/);
  }
});
