import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { findProjectRoot, isVeriProject } from './root.ts';

test('an explicit root wins and is resolved', () => {
  assert.equal(findProjectRoot('/tmp/../tmp/x', '/anywhere'), resolve('/tmp/x'));
});

test('walks up from cwd to the nearest directory containing veri/', async () => {
  const root = await mkdtemp(join(tmpdir(), 'veri-root-'));
  await mkdir(join(root, 'veri'));
  await mkdir(join(root, 'packages', 'ui'), { recursive: true });
  assert.equal(findProjectRoot(undefined, join(root, 'packages', 'ui')), root);
  assert.equal(findProjectRoot(undefined, root), root);
});

test('falls back to cwd when no veri/ exists on the path upward', async () => {
  const bare = await mkdtemp(join(tmpdir(), 'veri-bare-'));
  assert.equal(findProjectRoot(undefined, bare), bare);
});

test('isVeriProject requires a veri/ subdirectory', async () => {
  const root = await mkdtemp(join(tmpdir(), 'veri-check-'));
  assert.equal(isVeriProject(root), false);
  await mkdir(join(root, 'veri'));
  assert.equal(isVeriProject(root), true);
  assert.equal(isVeriProject(join(root, 'does-not-exist')), false);
});
