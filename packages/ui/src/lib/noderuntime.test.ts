import assert from 'node:assert/strict';
import { test } from 'node:test';
import { classifyProbe, nodeMajor, parseProbeOutput, probeNodeRuntime } from './noderuntime.ts';

test('parses the two-line probe output', () => {
  const parsed = parseProbeOutput('/opt/homebrew/bin/node\nv22.5.1\n');
  assert.deepEqual(parsed, { path: '/opt/homebrew/bin/node', version: 'v22.5.1' });
});

test('survives login-shell noise around the answer', () => {
  // .zprofile greetings, nvm banners — anything a login shell prints first.
  const parsed = parseProbeOutput('Welcome back!\n\n/Users/x/.nvm/versions/node/v20.11.0/bin/node\nv20.11.0\n');
  assert.deepEqual(parsed, { path: '/Users/x/.nvm/versions/node/v20.11.0/bin/node', version: 'v20.11.0' });
});

test('no node → not found, not usable', () => {
  assert.deepEqual(classifyProbe(''), { found: false, path: null, version: null, usable: false });
  assert.deepEqual(classifyProbe('command not found\n'), { found: false, path: null, version: null, usable: false });
});

test('old node → found but not usable; 20+ is usable', () => {
  const old = classifyProbe('/usr/local/bin/node\nv18.19.0\n');
  assert.equal(old.found, true);
  assert.equal(old.version, 'v18.19.0');
  assert.equal(old.usable, false);
  assert.equal(classifyProbe('/usr/local/bin/node\nv20.0.0\n').usable, true);
});

test('nodeMajor parses the major and rejects garbage', () => {
  assert.equal(nodeMajor('v22.5.1'), 22);
  assert.equal(nodeMajor('not-a-version'), null);
});

test('a shell that fails to start resolves as not found (never rejects)', async () => {
  const probe = await probeNodeRuntime('/nonexistent-shell-for-veri-test');
  assert.deepEqual(probe, { found: false, path: null, version: null, usable: false });
});
