import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
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

// WO-054 (SRC-026): the open tab set rides in the same file, additively.
test('tabs and active round-trip; the file version stays 1', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'veri-ws-'));
  const tabs = [
    { target: 'REQ-001', preview: false },
    { target: 'homeview', preview: false },
    { target: 'DEC-002', preview: true },
  ];
  await saveWorkspaceState(dir, '/p/a', { pinned: [], recents: [], tabs, active: 2 });
  assert.deepEqual(await loadWorkspaceState(dir, '/p/a'), { pinned: [], recents: [], tabs, active: 2 });
  const raw = JSON.parse(await readFile(join(dir, 'workspace-state.json'), 'utf-8'));
  assert.equal(raw.version, 1);
});

test('a pre-WO-054 entry without tabs/active loads and saves without growing the fields', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'veri-ws-'));
  await saveWorkspaceState(dir, '/p/a', { pinned: ['REQ-001'], recents: [] });
  const loaded = await loadWorkspaceState(dir, '/p/a');
  assert.deepEqual(loaded, { pinned: ['REQ-001'], recents: [] });
  assert.ok(!('tabs' in loaded) && !('active' in loaded));
});

test('malformed tab rows and a junk active index drop silently on load', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'veri-ws-'));
  const raw = {
    version: 1,
    projects: {
      '/p/a': {
        pinned: [],
        recents: [],
        tabs: [{ target: 'REQ-001', preview: false }, { target: 42 }, 'junk', null, { preview: true }],
        active: -2.5,
      },
    },
  };
  await writeFile(join(dir, 'workspace-state.json'), JSON.stringify(raw));
  const loaded = await loadWorkspaceState(dir, '/p/a');
  assert.deepEqual(loaded.tabs, [{ target: 'REQ-001', preview: false }]);
  assert.ok(!('active' in loaded));
});

test('recents are capped at 10 on save and corrupt files start clean', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'veri-ws-'));
  const recents = Array.from({ length: 14 }, (_, i) => `WO-0${String(i).padStart(2, '0')}`);
  await saveWorkspaceState(dir, '/p/a', { pinned: [], recents });
  assert.equal((await loadWorkspaceState(dir, '/p/a')).recents.length, 10);
  const raw = JSON.parse(await readFile(join(dir, 'workspace-state.json'), 'utf-8'));
  assert.equal(raw.version, 1);
});
