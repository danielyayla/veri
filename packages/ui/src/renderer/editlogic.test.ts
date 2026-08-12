import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  GUARD_NOTICE,
  frontmatterRegion,
  guardedRanges,
  ipcErrorMessage,
  reconcileDisk,
  touchedGuard,
} from './editlogic.ts';

const DOC = `---
id: REQ-001
type: requirement
title: A requirement
status: draft
approved: 2026-08-02
created: 2026-08-01
updated: 2026-08-01
links: []
---

Body with id: not-frontmatter on a line.
`;

test('frontmatter region spans the fenced block', () => {
  const region = frontmatterRegion(DOC);
  assert.ok(region !== null);
  assert.equal(region.from, 0);
  assert.equal(DOC.slice(region.to - 4, region.to), '---\n');
  assert.equal(frontmatterRegion('no fences here'), null);
});

test('a missing closing fence degrades the region to the whole text', () => {
  const broken = DOC.replace(/\n---\n\nBody/, '\n\nBody');
  const region = frontmatterRegion(broken);
  assert.ok(region !== null);
  assert.equal(region.to, broken.length);
});

test('guarded ranges cover exactly the id: and approved: frontmatter lines', () => {
  const guards = guardedRanges(DOC);
  assert.deepEqual(
    guards.map((g) => [g.key, DOC.slice(g.from, g.to)]),
    [
      ['id', 'id: REQ-001'],
      ['approved', 'approved: 2026-08-02'],
    ],
  );
  // The body's "id: not-frontmatter" line is outside the region: not guarded.
});

test('nested "- id:" link lines are not guarded', () => {
  const withLinks = DOC.replace('links: []', 'links:\n  - id: DEC-001\n    rel: constrained-by');
  const guards = guardedRanges(withLinks);
  assert.equal(guards.filter((g) => g.key === 'id').length, 1);
});

test('touchedGuard catches edits inside, at the edges of, and across guarded lines', () => {
  const guards = guardedRanges(DOC);
  const idGuard = guards[0];
  // Typing inside the line.
  assert.equal(touchedGuard([{ from: idGuard.from + 4, to: idGuard.from + 4 }], guards)?.key, 'id');
  // Deleting the newline just before (joining from the fence line).
  assert.equal(touchedGuard([{ from: idGuard.from - 1, to: idGuard.from }], guards)?.key, 'id');
  // Deleting the newline at the end (joining the next line up).
  assert.equal(touchedGuard([{ from: idGuard.to, to: idGuard.to + 1 }], guards)?.key, 'id');
  // A body edit is free.
  assert.equal(touchedGuard([{ from: DOC.length - 2, to: DOC.length - 1 }], guards), null);
  assert.equal(GUARD_NOTICE[idGuard.key], 'id is immutable');
});

test('reconcileDisk implements the REQ-009 external-change rules', () => {
  const base = { baseText: 'a', dirty: false, ackDisk: null };
  assert.equal(reconcileDisk(base, 'a'), 'none');
  assert.equal(reconcileDisk(base, 'b'), 'reload');
  assert.equal(reconcileDisk({ ...base, dirty: true }, 'b'), 'conflict');
  assert.equal(reconcileDisk({ ...base, dirty: true }, null), 'deleted');
  assert.equal(reconcileDisk(base, null), 'closed');
  // "Keep mine" acknowledges one specific disk state — and only that one.
  assert.equal(reconcileDisk({ baseText: 'a', dirty: true, ackDisk: 'b' }, 'b'), 'none');
  assert.equal(reconcileDisk({ baseText: 'a', dirty: true, ackDisk: 'b' }, 'c'), 'conflict');
});

test('ipcErrorMessage unwraps Electron and error-name prefixes', () => {
  assert.equal(
    ipcErrorMessage(new Error("Error invoking remote method 'veri:save-doc': GuardedEditError: id is immutable")),
    'id is immutable',
  );
  assert.equal(ipcErrorMessage(new Error('plain message')), 'plain message');
});
