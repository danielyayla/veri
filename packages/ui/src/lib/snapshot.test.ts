import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { scaffoldProject } from '@veri/core';
import { buildSnapshot } from './snapshot.ts';

function sandbox(t: { after(fn: () => void): void }): string {
  const dir = mkdtempSync(join(tmpdir(), 'veri-snapshot-test-'));
  scaffoldProject(dir);
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

const BARE_REQ = `---
id: REQ-001
type: requirement
title: Bare
status: draft
created: 2026-08-13
updated: 2026-08-13
---
(prose, no sections)
`;

test('snapshot carries both tiers; advisories never touch the issue list', async (t) => {
  const dir = sandbox(t);
  writeFileSync(join(dir, 'veri/requirements/REQ-001-bare.md'), BARE_REQ);

  const snap = await buildSnapshot(dir);
  assert.deepEqual(snap.issues, []);
  assert.deepEqual(snap.advisories, [
    {
      kind: 'missing-section',
      file: 'requirements/REQ-001-bare.md',
      id: 'REQ-001',
      section: 'Acceptance criteria',
      message: 'REQ-001 has no "## Acceptance criteria" section — the requirement template expects one',
    },
  ]);
});

test('editing the effective template changes advisories on the next snapshot (DEC-002)', async (t) => {
  const dir = sandbox(t);
  writeFileSync(join(dir, 'veri/requirements/REQ-001-bare.md'), BARE_REQ);
  assert.equal((await buildSnapshot(dir)).advisories.length, 1);

  // A template with no ## headings expects nothing — the advisory clears
  // with no restart, no cache, nothing but the next rebuild.
  writeFileSync(join(dir, 'veri/templates/requirement.md'), '(free-form)\n');
  const snap = await buildSnapshot(dir);
  assert.deepEqual(snap.advisories, []);
  assert.deepEqual(snap.issues, []);
});
