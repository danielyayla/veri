import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { TestContext } from 'node:test';
import {
  CURRENT_FORMAT,
  classifyFormat,
  formatStatement,
  isOperableFormat,
  migrateProject,
  writeFormatMarker,
} from './format.ts';
import { checkFormat } from './check.ts';
import { loadProject } from './load.ts';

function tmpVeriDir(t: TestContext): string {
  const dir = mkdtempSync(join(tmpdir(), 'veri-format-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  mkdirSync(join(dir, 'requirements'), { recursive: true });
  return dir;
}

test('a directory without a marker is pre-marker, format 0, operable', (t) => {
  const dir = tmpVeriDir(t);
  const c = classifyFormat(dir);
  assert.deepEqual(c, { kind: 'pre-marker', version: 0 });
  assert.equal(isOperableFormat(c), true);
  assert.match(formatStatement(c) ?? '', /veri migrate/);
});

test('the current marker classifies current with a null statement', (t) => {
  const dir = tmpVeriDir(t);
  writeFormatMarker(dir);
  assert.equal(readFileSync(join(dir, 'format'), 'utf8'), `${CURRENT_FORMAT}\n`);
  const c = classifyFormat(dir);
  assert.deepEqual(c, { kind: 'current', version: CURRENT_FORMAT });
  assert.equal(formatStatement(c), null);
});

test('a newer marker is inoperable and its statement says to update Veri', (t) => {
  const dir = tmpVeriDir(t);
  writeFormatMarker(dir, CURRENT_FORMAT + 1);
  const c = classifyFormat(dir);
  assert.equal(c.kind, 'newer');
  assert.equal(isOperableFormat(c), false);
  assert.match(formatStatement(c) ?? '', /update Veri/);
});

test('an unreadable marker is inoperable and names the raw content', (t) => {
  const dir = tmpVeriDir(t);
  writeFileSync(join(dir, 'format'), 'two\n');
  const c = classifyFormat(dir);
  assert.deepEqual(c, { kind: 'invalid', raw: 'two' });
  assert.equal(isOperableFormat(c), false);
  assert.match(formatStatement(c) ?? '', /"two"/);
});

test('migrating a pre-marker project writes the marker and touches nothing else', (t) => {
  const dir = tmpVeriDir(t);
  const doc = '---\nid: REQ-001\ntype: requirement\ntitle: T\nstatus: draft\ncreated: 2026-08-01\nupdated: 2026-08-01\nlinks: []\n---\n\nBody.\n';
  writeFileSync(join(dir, 'requirements', 'REQ-001-t.md'), doc);

  const result = migrateProject(dir);
  assert.equal(result.from, 0);
  assert.equal(result.to, CURRENT_FORMAT);
  assert.equal(result.applied.length, CURRENT_FORMAT);
  assert.equal(classifyFormat(dir).kind, 'current');
  // Content preserved byte-for-byte — the 0→1 step is marker-only.
  assert.equal(readFileSync(join(dir, 'requirements', 'REQ-001-t.md'), 'utf8'), doc);
});

test('a format-1 project migrates to current by markers alone — withdrawn (1→2), the product type (2→3) and the method type (3→4) need no document rewrite', (t) => {
  const dir = tmpVeriDir(t);
  writeFormatMarker(dir, 1);
  const doc = '---\nid: REQ-001\ntype: requirement\ntitle: T\nstatus: draft\ncreated: 2026-08-01\nupdated: 2026-08-01\nlinks: []\n---\n\nBody.\n';
  writeFileSync(join(dir, 'requirements', 'REQ-001-t.md'), doc);

  const result = migrateProject(dir);
  assert.equal(result.from, 1);
  assert.equal(result.to, 4);
  assert.equal(result.applied.length, 3);
  assert.match(result.applied[0] ?? '', /withdrawn status/);
  assert.match(result.applied[1] ?? '', /product document type/);
  assert.match(result.applied[2] ?? '', /method document type/);
  assert.equal(readFileSync(join(dir, 'requirements', 'REQ-001-t.md'), 'utf8'), doc);
});

test('migrating a current project is a no-op', (t) => {
  const dir = tmpVeriDir(t);
  writeFormatMarker(dir);
  const result = migrateProject(dir);
  assert.deepEqual(result, { from: CURRENT_FORMAT, to: CURRENT_FORMAT, applied: [] });
});

test('migrating a newer or invalid project throws the statement', (t) => {
  const dir = tmpVeriDir(t);
  writeFormatMarker(dir, CURRENT_FORMAT + 1);
  assert.throws(() => migrateProject(dir), /update Veri/);
  writeFileSync(join(dir, 'format'), 'garbage');
  assert.throws(() => migrateProject(dir), /unreadable/);
});

test('checkFormat: newer and invalid are issues, pre-marker and older are not', (t) => {
  const dir = tmpVeriDir(t);
  assert.deepEqual(checkFormat(classifyFormat(dir)), []);
  writeFormatMarker(dir, CURRENT_FORMAT + 1);
  const issues = checkFormat(classifyFormat(dir));
  assert.equal(issues.length, 1);
  assert.equal(issues[0]?.kind, 'format-mismatch');
  writeFormatMarker(dir);
  assert.deepEqual(checkFormat(classifyFormat(dir)), []);
});

test('loadProject classifies the format and never parses the marker as a document', async (t) => {
  const dir = tmpVeriDir(t);
  writeFormatMarker(dir);
  const load = await loadProject(dir);
  assert.deepEqual(load.format, { kind: 'current', version: CURRENT_FORMAT });
  assert.deepEqual(load.documents, []);
  assert.deepEqual(load.issues, []);
});
