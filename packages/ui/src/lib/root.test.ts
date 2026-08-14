import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { findProjectRoot, isVeriProject, launchArg } from './root.ts';

/** A real project root: veri/ with one of the four REQ-001 subdirs. */
async function makeProject(prefix: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), prefix));
  await mkdir(join(root, 'veri', 'requirements'), { recursive: true });
  return root;
}

test('an explicit root wins and is resolved', () => {
  assert.equal(findProjectRoot('/tmp/../tmp/x', '/anywhere'), resolve('/tmp/x'));
});

test('walks up from cwd to the nearest Veri project', async () => {
  const root = await makeProject('veri-root-');
  await mkdir(join(root, 'packages', 'ui'), { recursive: true });
  assert.equal(findProjectRoot(undefined, join(root, 'packages', 'ui')), root);
  assert.equal(findProjectRoot(undefined, root), root);
});

test('falls back to cwd when no project exists on the path upward', async () => {
  const bare = await mkdtemp(join(tmpdir(), 'veri-bare-'));
  assert.equal(findProjectRoot(undefined, bare), bare);
});

test('isVeriProject accepts what veri init produces', async () => {
  const root = await mkdtemp(join(tmpdir(), 'veri-check-'));
  assert.equal(isVeriProject(root), false);
  for (const sub of ['requirements', 'decisions', 'work-orders', 'sources']) {
    await mkdir(join(root, 'veri', sub), { recursive: true });
  }
  assert.equal(isVeriProject(root), true);
  assert.equal(isVeriProject(join(root, 'does-not-exist')), false);
});

test('one knowledge-base subdirectory is enough (hand-made projects)', async () => {
  const root = await mkdtemp(join(tmpdir(), 'veri-partial-'));
  await mkdir(join(root, 'veri', 'decisions'), { recursive: true });
  assert.equal(isVeriProject(root), true);
});

test('a directory merely NAMED veri is not a project (repo clone in ~/Projects)', async () => {
  const projects = await mkdtemp(join(tmpdir(), 'veri-clone-'));
  // ~/Projects/veri: a checkout of this repo — has src/, packages/, its own
  // nested veri/, but the entry itself is not a knowledge base.
  await mkdir(join(projects, 'veri', 'packages'), { recursive: true });
  await mkdir(join(projects, 'veri', 'veri', 'requirements'), { recursive: true });
  assert.equal(isVeriProject(projects), false, 'the parent folder must not read as a project');
  assert.equal(isVeriProject(join(projects, 'veri')), true, 'the clone itself IS a project');
});

test('a FILE named veri is not a project', async () => {
  const root = await mkdtemp(join(tmpdir(), 'veri-file-'));
  await writeFile(join(root, 'veri'), 'not a directory');
  assert.equal(isVeriProject(root), false);
});

test('a bare veri/ with no knowledge-base subdirs is not a project', async () => {
  const root = await mkdtemp(join(tmpdir(), 'veri-empty-'));
  await mkdir(join(root, 'veri'));
  assert.equal(isVeriProject(root), false);
});

test('walk-up skips a folder that only contains a veri-named clone', async () => {
  const projects = await mkdtemp(join(tmpdir(), 'veri-walk-'));
  const clone = join(projects, 'veri');
  await mkdir(join(clone, 'veri', 'requirements'), { recursive: true });
  await mkdir(join(clone, 'packages', 'ui'), { recursive: true });
  // From inside the clone, the clone is the root — never its parent.
  assert.equal(findProjectRoot(undefined, join(clone, 'packages', 'ui')), clone);
});

test('launchArg reads the packaged and dev argv offsets', () => {
  assert.equal(launchArg(['/App/Veri', '/proj'], true), '/proj');
  assert.equal(launchArg(['electron', '.', '/proj'], false), '/proj');
  assert.equal(launchArg(['electron', '.'], false), undefined);
  assert.equal(launchArg(['/App/Veri'], true), undefined);
});

test('launchArg skips flag-style arguments', () => {
  assert.equal(launchArg(['/App/Veri', '--enable-logging', '/proj'], true), '/proj');
  assert.equal(launchArg(['/App/Veri', '--enable-logging'], true), undefined);
});
