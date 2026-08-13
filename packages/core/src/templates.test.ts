import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DOC_TYPES } from './ids.ts';
import { createDocument } from './create.ts';
import { loadProject } from './load.ts';
import {
  BODY_TEMPLATES,
  TEMPLATES_SUBDIR,
  getTemplate,
  isCustomized,
  templateFile,
  writeDefaultTemplates,
} from './templates.ts';

function sandbox(t: { after(fn: () => void): void }): string {
  const dir = mkdtempSync(join(tmpdir(), 'veri-templates-test-'));
  for (const sub of ['requirements', 'decisions', 'work-orders', 'sources']) {
    mkdirSync(join(dir, sub), { recursive: true });
  }
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

test('getTemplate falls back to the built-in default when the project has no file', (t) => {
  const dir = sandbox(t);
  for (const type of DOC_TYPES) {
    assert.deepEqual(getTemplate(dir, type), { body: BODY_TEMPLATES[type], source: 'builtin' });
    assert.equal(isCustomized(dir, type), false);
  }
});

test('a project file overrides the built-in and is read fresh on every call', (t) => {
  const dir = sandbox(t);
  mkdirSync(join(dir, TEMPLATES_SUBDIR));
  const custom = '\n## Context\n\n(Why.)\n';
  writeFileSync(join(dir, templateFile('decision')), custom);

  assert.deepEqual(getTemplate(dir, 'decision'), { body: custom, source: 'project' });
  assert.equal(isCustomized(dir, 'decision'), true);

  // No caching (DEC-002): an edit shows up on the next read.
  const edited = '\n## Context\n\n(Why.)\n\n## Consequences\n\n(What changes.)\n';
  writeFileSync(join(dir, templateFile('decision')), edited);
  assert.equal(getTemplate(dir, 'decision').body, edited);
});

test('a project file matching the built-in counts as not customized', (t) => {
  const dir = sandbox(t);
  mkdirSync(join(dir, TEMPLATES_SUBDIR));
  writeFileSync(join(dir, templateFile('source')), `${BODY_TEMPLATES.source.trim()}\n\n`);
  assert.equal(getTemplate(dir, 'source').source, 'project');
  assert.equal(isCustomized(dir, 'source'), false);
});

test('writeDefaultTemplates materializes every type once and never overwrites', (t) => {
  const dir = sandbox(t);
  mkdirSync(join(dir, TEMPLATES_SUBDIR));
  writeFileSync(join(dir, templateFile('requirement')), 'mine\n');

  writeDefaultTemplates(dir);
  assert.deepEqual(
    readdirSync(join(dir, TEMPLATES_SUBDIR)).sort(),
    DOC_TYPES.map((type) => `${type}.md`).sort(),
  );
  assert.equal(readFileSync(join(dir, templateFile('requirement')), 'utf8'), 'mine\n');
  assert.equal(readFileSync(join(dir, templateFile('decision')), 'utf8'), BODY_TEMPLATES.decision);
});

test('createDocument scaffolds from the project template, falling back when deleted', async (t) => {
  const dir = sandbox(t);
  mkdirSync(join(dir, TEMPLATES_SUBDIR));
  const custom = '\n## Context\n\n(Why.)\n\n## Decision\n\n(What.)\n';
  writeFileSync(join(dir, templateFile('decision')), custom);

  const withCustom = await createDocument(dir, 'decision', 'Custom shaped', '2026-08-13');
  assert.ok(withCustom.text.endsWith(custom), 'body should be the project template');
  assert.match(withCustom.text, /^id: DEC-001$/m, 'frontmatter is unaffected by the template');

  rmSync(join(dir, templateFile('decision')));
  const withDefault = await createDocument(dir, 'decision', 'Default shaped', '2026-08-13');
  assert.ok(withDefault.text.endsWith(BODY_TEMPLATES.decision));
});

test('templates are not documents: the loader and doc counts ignore veri/templates/', async (t) => {
  const dir = sandbox(t);
  const before = await loadProject(dir);
  mkdirSync(join(dir, TEMPLATES_SUBDIR));
  writeFileSync(join(dir, templateFile('requirement')), 'no frontmatter at all\n');
  writeFileSync(join(dir, TEMPLATES_SUBDIR, 'stray.md'), '---\nbroken: yaml\n');

  const after = await loadProject(dir);
  assert.equal(after.documents.length, before.documents.length);
  assert.deepEqual(after.issues, []);
});
