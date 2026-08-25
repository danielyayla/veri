import { test } from 'node:test';
import assert from 'node:assert/strict';
import { acceptedRows, baseNames, commitRequests, confirmLabel, formatLabel, nextSrcNumber, provisionalIds, sheetFromInspect, sizeLabel, toastText } from './importlogic.ts';
import type { InspectRow } from './api.ts';

const OK: InspectRow = { path: '/tmp/notes.md', name: 'notes.md', size: 2048, ok: true, kind: 'md', title: 'Kickoff notes' };
const REFUSED: InspectRow = { path: '/tmp/scan.pdf', name: 'scan.pdf', size: 99, ok: false, message: 'cannot import scan.pdf: supported formats: .md .txt .eml' };

test('sheet seeds editable titles from derived ones; refusals carry none', () => {
  const sheet = sheetFromInspect([OK, REFUSED]);
  assert.equal(sheet.rows[0].editedTitle, 'Kickoff notes');
  assert.equal(sheet.rows[1].editedTitle, '');
  assert.equal(sheet.busy, false);
  assert.equal(sheet.error, null);
});

test('commit payload carries only accepted rows with their edited titles', () => {
  const sheet = sheetFromInspect([OK, REFUSED]);
  sheet.rows[0].editedTitle = 'Renamed';
  assert.equal(acceptedRows(sheet).length, 1);
  assert.deepEqual(commitRequests(sheet), [{ path: '/tmp/notes.md', title: 'Renamed' }]);
});

test('provisional ids number only accepted rows, in order, from the next free number', () => {
  const sheet = sheetFromInspect([REFUSED, OK, { ...OK, path: '/tmp/b.txt', name: 'b.txt', kind: 'txt' }]);
  assert.deepEqual(provisionalIds(sheet, 46), [null, 'SRC-046', 'SRC-047']);
});

test('labels: size, format, confirm, toast', () => {
  assert.equal(sizeLabel(312), '312 B');
  assert.equal(sizeLabel(48 * 1024), '48 KB');
  assert.equal(sizeLabel(1258291), '1.2 MB');
  assert.equal(formatLabel(OK), 'md → text');
  assert.equal(formatLabel(REFUSED), '');
  assert.equal(confirmLabel(sheetFromInspect([OK, REFUSED])), 'Import 1 file');
  assert.equal(confirmLabel(sheetFromInspect([OK, { ...OK, path: '/x' }])), 'Import 2 files');
  assert.equal(toastText([{ id: 'SRC-045', file: 'f', original: 'o', title: 't' }]), '✓ 1 source filed · original preserved');
  assert.match(toastText([{ id: 'SRC-045', file: 'f', original: 'o', title: 't' }, { id: 'SRC-046', file: 'g', original: 'p', title: 'u' }]), /2 sources filed · originals preserved/);
});

test('nextSrcNumber reads the corpus high-water, ignoring other types', () => {
  assert.equal(nextSrcNumber(['REQ-031', 'SRC-044', 'SRC-009', 'WO-096']), 45);
  assert.equal(nextSrcNumber(['REQ-001']), 1);
});

test('baseNames strips directories on both path flavors', () => {
  assert.deepEqual(baseNames(['/a/b/notes.md', 'C:\\Users\\d\\thread.eml']), ['notes.md', 'thread.eml']);
});
