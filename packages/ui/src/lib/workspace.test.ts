import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadWorkspaceState, saveWorkspaceState } from './workspace.ts';

test('load returns empty state for a fresh config dir or unknown project', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'veri-ws-'));
  assert.deepEqual(await loadWorkspaceState(dir, '/p/a'), { pinned: [], recents: [] });
});

test('save/load round-trips per project without cross-talk', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'veri-ws-'));
  await saveWorkspaceState(dir, '/p/a', { pinned: ['REQ-001'], recents: ['WO-002', 'REQ-001'] });
  await saveWorkspaceState(dir, '/p/b', { pinned: [], recents: ['DEC-003'] });
  assert.deepEqual(await loadWorkspaceState(dir, '/p/a'), { pinned: ['REQ-001'], recents: ['WO-002', 'REQ-001'] });
  assert.deepEqual(await loadWorkspaceState(dir, '/p/b'), { pinned: [], recents: ['DEC-003'] });
});

test('recents are capped at 10 on save and corrupt files start clean', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'veri-ws-'));
  const recents = Array.from({ length: 14 }, (_, i) => `WO-0${String(i).padStart(2, '0')}`);
  await saveWorkspaceState(dir, '/p/a', { pinned: [], recents });
  assert.equal((await loadWorkspaceState(dir, '/p/a')).recents.length, 10);
  const raw = JSON.parse(await readFile(join(dir, 'workspace-state.json'), 'utf-8'));
  assert.equal(raw.version, 1);
});
