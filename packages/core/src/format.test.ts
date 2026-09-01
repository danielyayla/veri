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
import { checkFormat, checkProject } from './check.ts';
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

// DEC-139: the refusal is the only thing a stale *running* reader shows, so it
// names the restart alongside the update — neither repair on its own covers
// both the installed-and-behind and the running-and-behind cases.
test('the newer statement names restarting the reader, not only updating Veri', (t) => {
  const dir = tmpVeriDir(t);
  writeFormatMarker(dir, CURRENT_FORMAT + 1);
  const statement = formatStatement(classifyFormat(dir)) ?? '';
  assert.match(statement, /update Veri/);
  assert.match(statement, /restart/);
  assert.match(statement, /reconnect/);
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

test('a format-1 project migrates to current — three marker-only steps, then the 4→5 ready rewrite', (t) => {
  const dir = tmpVeriDir(t);
  writeFormatMarker(dir, 1);
  const doc = '---\nid: REQ-001\ntype: requirement\ntitle: T\nstatus: draft\ncreated: 2026-08-01\nupdated: 2026-08-01\nlinks: []\n---\n\nBody.\n';
  writeFileSync(join(dir, 'requirements', 'REQ-001-t.md'), doc);

  const result = migrateProject(dir);
  assert.equal(result.from, 1);
  assert.equal(result.to, 5);
  assert.equal(result.applied.length, 4);
  assert.match(result.applied[0] ?? '', /withdrawn status/);
  assert.match(result.applied[1] ?? '', /product document type/);
  assert.match(result.applied[2] ?? '', /method document type/);
  assert.match(result.applied[3] ?? '', /ready status retires/);
  assert.equal(readFileSync(join(dir, 'requirements', 'REQ-001-t.md'), 'utf8'), doc);
});

// --- The 4 → 5 content migration (DEC-143, WO-143) ---

test('a project holding on-disk ready work orders migrates them to backlog, stamps and everything else preserved', async (t) => {
  const dir = tmpVeriDir(t);
  mkdirSync(join(dir, 'work-orders'), { recursive: true });
  mkdirSync(join(dir, 'templates'), { recursive: true });
  writeFormatMarker(dir, 4);

  const ready =
    '---\nid: WO-001\ntype: work-order\ntitle: Cleared, unclaimed\nstatus: ready\napproved: 2026-08-25\napproved_by: Ada\ncreated: 2026-08-01\nupdated: 2026-08-25\nlinks:\n  - id: REQ-001\n    rel: implements\n---\n\n## Summary\n\nAwaiting a session.\n';
  const done =
    '---\nid: WO-002\ntype: work-order\ntitle: Finished\nstatus: done\napproved: 2026-08-10\nclaimed_by: s\nclaimed_at: 2026-08-10\ncreated: 2026-08-01\nupdated: 2026-08-12\nlinks:\n  - id: REQ-001\n    rel: implements\n---\n\n## Summary\n\nShipped.\n\n## Acceptance tests\n\n- [x] x\n\n## Receipts\n\n- 2026-08-12 — abc1234 — done\n';
  const req =
    '---\nid: REQ-001\ntype: requirement\ntitle: Live\nstatus: accepted\napproved: 2026-08-01\ncreated: 2026-08-01\nupdated: 2026-08-01\n---\n\nBody.\n\n## Acceptance criteria\n\n- [ ] x\n';
  // A template naming ready is not a document — the walker must skip it.
  const template = '---\ntype: work-order\nstatus: ready\n---\n\n## Summary\n';
  writeFileSync(join(dir, 'work-orders', 'WO-001-cleared.md'), ready);
  writeFileSync(join(dir, 'work-orders', 'WO-002-finished.md'), done);
  writeFileSync(join(dir, 'requirements', 'REQ-001-live.md'), req);
  writeFileSync(join(dir, 'templates', 'work-order.md'), template);

  const result = migrateProject(dir);
  assert.equal(result.from, 4);
  assert.equal(result.to, 5);
  assert.match(result.applied[0] ?? '', /ready status retires/);

  const migrated = readFileSync(join(dir, 'work-orders', 'WO-001-cleared.md'), 'utf8');
  // One line changed; the stamp and everything else survive byte-for-byte.
  assert.equal(migrated, ready.replace('status: ready', 'status: backlog'));
  assert.match(migrated, /^approved: 2026-08-25$/m);
  assert.match(migrated, /^approved_by: Ada$/m);
  // Non-ready documents and non-documents are untouched.
  assert.equal(readFileSync(join(dir, 'work-orders', 'WO-002-finished.md'), 'utf8'), done);
  assert.equal(readFileSync(join(dir, 'requirements', 'REQ-001-live.md'), 'utf8'), req);
  assert.equal(readFileSync(join(dir, 'templates', 'work-order.md'), 'utf8'), template);

  // The migrated project parses and checks clean — the acceptance bar.
  const load = await loadProject(dir);
  assert.deepEqual(load.format, { kind: 'current', version: CURRENT_FORMAT });
  const wo = load.documents.find((d) => d.id === 'WO-001');
  assert.equal(wo?.status, 'backlog');
  assert.equal(wo?.approved, '2026-08-25');
  assert.deepEqual(checkProject(load).issues, []);
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
