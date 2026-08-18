import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createDocument } from './create.ts';
import { nextIdNumber, readIdRecord, recordIssuedId } from './idstore.ts';

function sandbox(t: { after(fn: () => void): void }): string {
  const dir = mkdtempSync(join(tmpdir(), 'veri-idstore-test-'));
  for (const sub of ['requirements', 'decisions', 'work-orders', 'sources']) {
    mkdirSync(join(dir, sub), { recursive: true });
  }
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

test('a deleted id is never reissued — the record outlives the file', async (t) => {
  const dir = sandbox(t);
  await createDocument(dir, 'requirement', 'First', '2026-08-18');
  const second = await createDocument(dir, 'requirement', 'Second', '2026-08-18');
  assert.equal(second.id, 'REQ-002');

  unlinkSync(join(dir, second.file));
  const third = await createDocument(dir, 'requirement', 'Third', '2026-08-18');
  assert.equal(third.id, 'REQ-003');
});

test('with no ids file, allocation matches the old scan and writes the record', async (t) => {
  const dir = sandbox(t);
  writeFileSync(
    join(dir, 'requirements', 'REQ-007-existing.md'),
    ['---', 'id: REQ-007', 'type: requirement', 'title: Existing', 'status: draft', 'created: 2026-08-18', 'updated: 2026-08-18', '---', ''].join('\n'),
  );
  assert.equal(existsSync(join(dir, 'ids')), false);
  const result = await createDocument(dir, 'requirement', 'Backfill', '2026-08-18');
  assert.equal(result.id, 'REQ-008');
  assert.equal(readIdRecord(dir).REQ, 8);
});

test('a corrupt record never blocks creation and is repaired on the next write', async (t) => {
  const dir = sandbox(t);
  writeFileSync(join(dir, 'ids'), 'REQ eleven\nDEC 4\nnot a line\n');
  const record = readIdRecord(dir);
  assert.deepEqual(record, { DEC: 4 });

  const req = await createDocument(dir, 'requirement', 'Fresh', '2026-08-18');
  assert.equal(req.id, 'REQ-001');
  const dec = await createDocument(dir, 'decision', 'Choice', '2026-08-18');
  assert.equal(dec.id, 'DEC-005');
  assert.equal(readFileSync(join(dir, 'ids'), 'utf8'), 'REQ 1\nDEC 5\n');
});

test('the record is a floor, not a ceiling — existing files above it still win', (t) => {
  const dir = sandbox(t);
  recordIssuedId(dir, 'WO', 3);
  assert.equal(nextIdNumber(dir, 'WO', ['WO-009']), 10);
  assert.equal(nextIdNumber(dir, 'WO', []), 4);
});

test('allocation refuses to pass 999', (t) => {
  const dir = sandbox(t);
  recordIssuedId(dir, 'SRC', 999);
  assert.throws(() => nextIdNumber(dir, 'SRC', []), /no free SRC- id left/);
});
