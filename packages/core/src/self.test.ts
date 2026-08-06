import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadProject } from './load.ts';
import { checkProject } from './check.ts';

test("this repository's own veri/ directory yields zero issues", async () => {
  const load = await loadProject(new URL('../../../veri', import.meta.url));
  assert.ok(load.documents.length >= 11, `expected the full knowledge base, got ${load.documents.length} documents`);
  assert.deepEqual(checkProject(load), []);
});
