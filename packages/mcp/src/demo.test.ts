import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assembleContext } from './context.ts';

// The skiff demo bundled with the CLI is itself a valid project root:
// veri/ plus a CLAUDE.md. This is the WO-004 acceptance test — the demo
// package must match the mockup's context panel.
const DEMO_ROOT = fileURLToPath(new URL('../../cli/demo/', import.meta.url));

test('get_context("WO-002") on the demo matches the mockup context panel', async () => {
  const pkg = await assembleContext(DEMO_ROOT, 'WO-002');

  assert.match(pkg.text, /^# Context package · WO-002 — PDF export pipeline/);
  assert.match(pkg.text, /## Project conventions \(CLAUDE\.md\)/);
  assert.match(pkg.text, /skiff is a local-first invoicing app/);

  assert.match(pkg.text, /REQ-002 — PDF export with templates/);
  assert.match(pkg.text, /DEC-005 — Typst for PDF rendering/);
  assert.match(pkg.text, /DEC-002 — Tauri over Electron/);
  assert.match(pkg.text, /### SRC-001 — Client interview transcript · excerpt/);

  assert.match(pkg.text, /### Already rejected \(superseded — bodies omitted\)/);
  assert.match(pkg.text, /- DEC-003 — Handlebars templates \(superseded by DEC-005\)/);
  assert.ok(
    !pkg.text.includes('broke page-break control'),
    'the superseded DEC-003 body must be omitted',
  );

  assert.ok(pkg.totalTokens > 0);
});

test('the demo has exactly the two deliberate issues and no others', async () => {
  const { loadProject, checkProject } = await import('@veri/core');
  const load = await loadProject(join(DEMO_ROOT, 'veri'));
  assert.equal(load.documents.length, 16);
  const issues = checkProject(load);
  assert.deepEqual(
    issues.map((issue) => issue.kind).sort(),
    ['broken-link', 'wo-without-requirement'],
    JSON.stringify(issues, null, 2),
  );
});
