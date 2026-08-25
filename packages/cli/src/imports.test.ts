import { test } from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assembleArchitecture, checkObservedArchitecture, loadProject, moduleRegistry } from '@verikb/core';
import { collectExportFacts, collectImportFacts } from './imports.ts';

// Fixture source lines are assembled from pieces so the dogfood scan of this
// very file (it lives under a registry module path) can never read them as
// real imports.
const q = (spec: string) => `'${spec}'`;
const imp = (spec: string) => `import thing from ${q(spec)};\n`;
const req = (spec: string) => `const cfg = require(${q(spec)});\n`;
const exp = (spec: string) => `export { thing } from ${q(spec)};\n`;

function fixture(t: TestContext): string {
  const dir = mkdtempSync(join(tmpdir(), 'veri-imports-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  mkdirSync(join(dir, 'packages/one/src'), { recursive: true });
  mkdirSync(join(dir, 'packages/two/src'), { recursive: true });
  writeFileSync(join(dir, 'packages/one/package.json'), JSON.stringify({ name: '@x/one' }));
  writeFileSync(join(dir, 'packages/two/package.json'), JSON.stringify({ name: '@x/two' }));
  writeFileSync(join(dir, 'packages/two/src/lib.ts'), 'export const lib = 1;\n');
  return dir;
}

const MODULES = [
  { name: 'one', path: 'packages/one', purpose: 'P' },
  { name: 'two', path: 'packages/two', purpose: 'P' },
];

test('the collector resolves package names and boundary-crossing relative imports, and skips the rest', (t) => {
  const dir = fixture(t);
  writeFileSync(
    join(dir, 'packages/one/src/a.ts'),
    imp('@x/two') + // package name → edge
      imp('@x/two/deep/helper.ts') + // subpath of a package name → edge
      imp('node:fs') + // builtin → nothing
      imp('left-pad') + // external package → nothing
      imp('./b.ts') + // relative inside the module → nothing
      req('@x/two') + // require form — same edge, deduplicated
      exp('@x/two'), // export-from form — same edge, deduplicated
  );
  writeFileSync(join(dir, 'packages/one/src/b.ts'), imp('../../two/src/lib.ts'));
  // Vendored and hidden trees are never the module's own code.
  mkdirSync(join(dir, 'packages/one/node_modules/dep'), { recursive: true });
  writeFileSync(join(dir, 'packages/one/node_modules/dep/index.js'), imp('@x/two'));
  mkdirSync(join(dir, 'packages/one/.cache'), { recursive: true });
  writeFileSync(join(dir, 'packages/one/.cache/generated.ts'), imp('@x/two'));

  const { edges, skipped } = collectImportFacts(dir, MODULES);
  assert.deepEqual(skipped, []);
  assert.deepEqual(edges, [
    { from: 'one', to: 'two', file: 'packages/one/src/a.ts', specifier: '@x/two' },
    { from: 'one', to: 'two', file: 'packages/one/src/a.ts', specifier: '@x/two/deep/helper.ts' },
    { from: 'one', to: 'two', file: 'packages/one/src/b.ts', specifier: '../../two/src/lib.ts' },
  ]);
});

test('a registry module whose path is not on disk is skipped, never a failure', (t) => {
  const dir = fixture(t);
  writeFileSync(join(dir, 'packages/one/src/a.ts'), imp('@x/two'));
  const ghost = { name: 'ghost', path: 'packages/ghost', purpose: 'P' };
  const { edges, skipped } = collectImportFacts(dir, [...MODULES, ghost]);
  assert.deepEqual(skipped, [ghost]);
  assert.deepEqual(edges, [{ from: 'one', to: 'two', file: 'packages/one/src/a.ts', specifier: '@x/two' }]);
});

test('dogfood: this repository reports zero violations against its own intended architecture', async () => {
  const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
  const load = await loadProject(join(repoRoot, 'veri'));
  const modules = moduleRegistry(load.documents);
  const dec060 = assembleArchitecture(load.documents).rules.filter(
    (rule) => rule.decisionId === 'DEC-060' && !rule.allowed,
  );
  assert.equal(dec060.length, 7); // DEC-060's seven forbidden edges
  const { edges, skipped } = collectImportFacts(repoRoot, modules);
  assert.deepEqual(skipped, []);
  assert.ok(edges.length > 0, 'the scan should see real edges (cli → core at least)');
  assert.deepEqual(checkObservedArchitecture(load.documents, edges), { issues: [], violations: [] });
});

// ---- Per-file detail and entry-point exports (WO-068, DEC-087) ------------

test('the scan keeps per-file detail: every source file with its specifiers, deduped, in walk order', (t) => {
  const dir = fixture(t);
  writeFileSync(join(dir, 'packages/one/src/a.ts'), imp('@x/two') + imp('node:fs') + imp('@x/two') + imp('./b.ts'));
  writeFileSync(join(dir, 'packages/one/src/b.ts'), 'export const b = 1;\n');
  const { files } = collectImportFacts(dir, MODULES);
  assert.deepEqual(files, [
    { module: 'one', file: 'packages/one/src/a.ts', imports: ['@x/two', 'node:fs', './b.ts'] },
    { module: 'one', file: 'packages/one/src/b.ts', imports: [] },
    { module: 'two', file: 'packages/two/src/lib.ts', imports: [] },
  ]);
});

test('a file under a nested module path appears once, attributed to the innermost module', (t) => {
  const dir = fixture(t);
  mkdirSync(join(dir, 'packages/one/plugins/pay'), { recursive: true });
  writeFileSync(join(dir, 'packages/one/plugins/pay/index.ts'), imp('@x/two'));
  writeFileSync(join(dir, 'packages/one/src/a.ts'), 'export const a = 1;\n');
  const nested = { name: 'pay', path: 'packages/one/plugins/pay', purpose: 'P' };
  const { files } = collectImportFacts(dir, [...MODULES, nested]);
  const payFiles = files.filter((f) => f.file === 'packages/one/plugins/pay/index.ts');
  assert.equal(payFiles.length, 1);
  assert.equal(payFiles[0].module, 'pay');
});

test('export discovery reads manifest entries and index conventions, follows relative re-exports, and sorts', (t) => {
  const dir = fixture(t);
  // two: src/index.ts convention with an export-star chain and every form.
  writeFileSync(
    join(dir, 'packages/two/src/index.ts'),
    'export function alpha() {}\n' +
      'export const beta = 1;\n' +
      'export type Gamma = string;\n' +
      'export { delta as epsilon,\n  zeta } from ' + q('./lib.ts') + ';\n' +
      'export * from ' + q('./more.ts') + ';\n' +
      'export * as ns from ' + q('./lib.ts') + ';\n',
  );
  writeFileSync(join(dir, 'packages/two/src/more.ts'), 'export class Eta {}\nexport * from ' + q('./index.ts') + ';\n');
  // one: manifest main pointing at a file (no src/index).
  writeFileSync(join(dir, 'packages/one/package.json'), JSON.stringify({ name: '@x/one', main: 'entry.js' }));
  writeFileSync(join(dir, 'packages/one/entry.js'), 'export default 1;\nexport const solo = 2;\n');
  const facts = collectExportFacts(dir, MODULES);
  assert.deepEqual(facts['one'], ['default', 'solo']);
  // Cycle-guarded: more.ts's export * back into index.ts terminates.
  assert.deepEqual(facts['two'], ['Eta', 'Gamma', 'alpha', 'beta', 'epsilon', 'ns', 'zeta']);
});

test('a module with no manifest and no index has no discoverable entry point — an empty list, never a failure', (t) => {
  const dir = fixture(t);
  const bare = { name: 'bare', path: 'packages/bare', purpose: 'P' };
  mkdirSync(join(dir, 'packages/bare/lib'), { recursive: true });
  writeFileSync(join(dir, 'packages/bare/lib/thing.ts'), 'export const hidden = 1;\n');
  const facts = collectExportFacts(dir, [bare]);
  assert.deepEqual(facts['bare'], []);
});

test('export discovery walks manifest exports-map leaves', (t) => {
  const dir = fixture(t);
  writeFileSync(
    join(dir, 'packages/one/package.json'),
    JSON.stringify({ name: '@x/one', exports: { '.': { default: './lib/main.js' }, './extra': './lib/extra.js' } }),
  );
  mkdirSync(join(dir, 'packages/one/lib'), { recursive: true });
  writeFileSync(join(dir, 'packages/one/lib/main.js'), 'export const fromMain = 1;\n');
  writeFileSync(join(dir, 'packages/one/lib/extra.js'), 'export const fromExtra = 2;\n');
  const facts = collectExportFacts(dir, MODULES);
  assert.deepEqual(facts['one'], ['fromExtra', 'fromMain']);
});
