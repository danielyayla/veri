import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { scaffoldProject } from '@verikb/core';
import { runCheck } from './check.ts';
import { initProject, renderInit } from './init.ts';
import { listDocuments } from './enumerate.ts';
import { getReceipts } from './receipts.ts';

function sandbox(t: { after(fn: () => void): void }): string {
  const root = mkdtempSync(join(tmpdir(), 'veri-mcp-init-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

/** Every file under `dir`, with its bytes and mtime — the evidence for
    "nothing on disk was modified". */
function snapshot(dir: string): Map<string, string> {
  const entries = new Map<string, string>();
  for (const entry of readdirSync(dir, { recursive: true })) {
    const name = String(entry).replaceAll('\\', '/');
    const full = join(dir, name);
    if (statSync(full).isDirectory()) continue;
    entries.set(name, `${statSync(full).mtimeMs}:${readFileSync(full, 'utf8')}`);
  }
  return entries;
}

test('init_project scaffolds a knowledge base into a repo that has none', async (t) => {
  const root = sandbox(t);
  writeFileSync(join(root, 'package.json'), '{}\n'); // a repo with code in it

  const result = initProject(root);
  assert.deepEqual(
    { root: result.root, veriDir: result.veriDir, docCount: result.docCount, filesWritten: result.filesWritten, filesSkipped: result.filesSkipped },
    { root: '.', veriDir: 'veri', docCount: 1, filesWritten: ['AGENTS.md', 'CLAUDE.md'], filesSkipped: [] },
  );

  // The tree core's scaffold makes, present on disk under the reported path.
  for (const sub of ['requirements', 'decisions', 'work-orders', 'sources']) {
    assert.ok(existsSync(join(root, 'veri', sub)), `expected veri/${sub}`);
  }
  assert.ok(existsSync(join(root, 'veri', 'workflow.md')));
  assert.ok(existsSync(join(root, 'veri', 'format')));
  assert.ok(existsSync(join(root, 'veri', 'templates')));
  // Existing code is untouched; the pointer files are the only root writes.
  assert.equal(readFileSync(join(root, 'package.json'), 'utf8'), '{}\n');
  for (const file of result.filesWritten) assert.ok(existsSync(join(root, file)));

  // Acceptance: what it creates is a healthy knowledge base, not merely a
  // directory — zero issues from the same derivation `veri check` runs.
  const report = await runCheck(root);
  assert.ok(report !== null, 'the scaffolded project must be loadable');
  assert.deepEqual(report.issues, []);
});

// The point of the tool: one scaffold implementation, core's. If this door
// ever grew its own idea of what an empty project contains, the two trees
// would drift and this test is what notices.
test('the returned shape is exactly what core’s scaffoldProject reports', (t) => {
  const viaTool = initProject(sandbox(t));
  const direct = scaffoldProject(sandbox(t));
  assert.deepEqual(
    [viaTool.docCount, viaTool.filesWritten, viaTool.filesSkipped],
    [direct.docCount, direct.filesWritten, direct.filesSkipped],
  );
  assert.ok(direct.veriDir.endsWith('veri') && viaTool.veriDir === 'veri', 'the door answers project-relative, core absolute');
});

test('an existing veri/ is refused by name, and nothing on disk is modified', (t) => {
  const root = sandbox(t);
  initProject(root);
  writeFileSync(join(root, 'veri', 'requirements', 'REQ-001-mine.md'), 'my own document\n');
  const before = snapshot(root);

  assert.throws(
    () => initProject(root),
    (err: Error) => {
      assert.match(err.message, /^veri\/ already exists in /);
      assert.ok(err.message.includes(root), 'the refusal must name the directory');
      assert.match(err.message, /never touched/);
      return true;
    },
  );
  assert.deepEqual(snapshot(root), before, 'a refused init must write nothing and touch nothing');
});

test('a root-level file that already exists is skipped, never overwritten (DEC-007’s posture)', (t) => {
  const root = sandbox(t);
  writeFileSync(join(root, 'CLAUDE.md'), 'my own harness file\n');

  const result = initProject(root);
  assert.deepEqual([result.filesWritten, result.filesSkipped], [['AGENTS.md'], ['CLAUDE.md']]);
  assert.equal(readFileSync(join(root, 'CLAUDE.md'), 'utf8'), 'my own harness file\n');
  assert.match(renderInit(result), /^Skipped CLAUDE\.md — one already exists there and was left untouched\.$/m);
});

test('path initializes a subdirectory of the server’s root, and the answer is project-relative', (t) => {
  const root = sandbox(t);
  mkdirSync(join(root, 'apps', 'web'), { recursive: true });

  const result = initProject(root, 'apps/web');
  assert.equal(result.root, 'apps/web');
  assert.equal(result.veriDir, 'apps/web/veri');
  assert.ok(existsSync(join(root, 'apps', 'web', 'veri', 'workflow.md')));
  assert.ok(!existsSync(join(root, 'veri')), 'the server root must not be scaffolded when a path is given');
  assert.match(renderInit(result), /^Initialized apps\/web\/veri — 1 document/);
  assert.match(renderInit(result), /^Wrote apps\/web\/AGENTS\.md/m);
});

test('a path outside the server’s project root is refused, and writes nothing', (t) => {
  const root = sandbox(t);
  const outside = sandbox(t);
  for (const path of ['..', '../elsewhere', outside, join(root, '..', 'elsewhere')]) {
    assert.throws(() => initProject(root, path), /resolves outside this server's project root/, `expected refusal for ${path}`);
  }
  assert.deepEqual(readdirSync(root), []);
  assert.deepEqual(readdirSync(outside), []);
});

test('a path naming no directory is refused rather than created (degrade loudly)', (t) => {
  const root = sandbox(t);
  writeFileSync(join(root, 'README.md'), 'a file, not a directory\n');
  assert.throws(() => initProject(root, 'aps/web'), /no such directory: aps\/web \(under /);
  assert.throws(() => initProject(root, 'README.md'), /no such directory: README\.md \(under /);
  assert.ok(!existsSync(join(root, 'aps')), 'a typo must not be scaffolded into existence');
});

// WO-129's reason for existing: the tools that load a project cannot answer
// on a bare repo, and this one can. Both halves are asserted so the property
// cannot rot into "everything fails here".
test('the door opens on a bare repo where every loadProject-backed tool refuses', async (t) => {
  const root = sandbox(t);
  await assert.rejects(getReceipts(root), /no veri\/ directory/);
  await assert.rejects(listDocuments(root), /no veri\/ directory/);

  const result = initProject(root);
  assert.equal(result.veriDir, 'veri');

  // …and afterwards they do answer: the same server, the same root.
  assert.deepEqual(await getReceipts(root), []);
  assert.deepEqual((await listDocuments(root)).map((row) => row.id), ['WF-001']);
});

test('the rendering names every path created, so the write is legible and undoable', (t) => {
  const text = renderInit(initProject(sandbox(t)));
  assert.deepEqual(text.split('\n'), [
    'Initialized veri — 1 document (the project workflow), the requirements/, decisions/, work-orders/, sources/, methods/ collections, and the document templates.',
    'Wrote AGENTS.md — a pointer at the workflow, not content (DEC-018).',
    'Wrote CLAUDE.md — a pointer at the workflow, not content (DEC-018).',
    'Nothing else on disk was changed: everything above is newly created, so this is undone by deleting exactly those paths.',
    'The knowledge base is empty by design. Nothing binds until the user files documents and approves them (REQ-008).',
  ]);
});

// No second scaffold in this package (WO-129), and no subprocess (DEC-081):
// the door delegates creation to core and shells out to nothing.
test('project creation exists only as a call into core’s scaffoldProject', async () => {
  const source = await readFile(new URL('./init.ts', import.meta.url), 'utf8');
  assert.match(source, /scaffoldProject\(target\)/, 'creation must be core’s call');
  assert.ok(!/writeFileSync|mkdirSync|cpSync|copyFileSync/.test(source), 'the door must write no file of its own');
  assert.ok(!/child_process|execFile|\bspawn\(/.test(source), 'the agent door spawns no subprocess (DEC-081)');

  // …and nowhere else in the package either: one call path to creation.
  const dir = new URL('./', import.meta.url).pathname;
  const callers = readdirSync(dir)
    .filter((file) => file.endsWith('.ts') && !file.endsWith('.test.ts'))
    .filter((file) => /scaffoldProject/.test(readFileSync(join(dir, file), 'utf8')));
  assert.deepEqual(callers, ['init.ts']);
});
