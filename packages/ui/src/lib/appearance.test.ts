import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isThemePref, loadThemePref, saveThemePref } from './appearance.ts';

test('defaults to system when nothing is stored', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'veri-appearance-'));
  assert.equal(await loadThemePref(dir), 'system');
});

test('round-trips each preference', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'veri-appearance-'));
  for (const pref of ['light', 'dark', 'system'] as const) {
    await saveThemePref(dir, pref);
    assert.equal(await loadThemePref(dir), pref);
  }
});

test('creates the config dir on first save', async () => {
  const dir = join(await mkdtemp(join(tmpdir(), 'veri-appearance-')), 'nested', 'config');
  await saveThemePref(dir, 'light');
  assert.equal(await loadThemePref(dir), 'light');
});

test('unknown or corrupt content falls back to system', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'veri-appearance-'));
  await writeFile(join(dir, 'appearance.json'), '{"theme":"solarized"}');
  assert.equal(await loadThemePref(dir), 'system');
  await writeFile(join(dir, 'appearance.json'), 'not json');
  assert.equal(await loadThemePref(dir), 'system');
});

test('isThemePref rejects non-prefs', () => {
  assert.equal(isThemePref('light'), true);
  assert.equal(isThemePref('auto'), false);
  assert.equal(isThemePref(null), false);
});
