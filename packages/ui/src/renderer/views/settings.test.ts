import { test } from 'node:test';
import assert from 'node:assert/strict';
import { updateStatusLine } from './settings.ts';
import type { AppInfo } from '../api.ts';

const packaged: AppInfo = { version: '1.2.3', packaged: true, home: '/Users/x', formatLabel: 'veri/format v1' };

test('a dev build says updates are a packaged-app thing', () => {
  const line = updateStatusLine({ ...packaged, packaged: false }, null);
  assert.match(line.text, /dev build/);
  assert.equal(line.ok, false);
});

test('a downloaded update wins over the last-check line', () => {
  const line = updateStatusLine(packaged, { downloadedVersion: '1.3.0', lastCheckAt: Date.now() });
  assert.match(line.text, /1\.3\.0/);
  assert.match(line.text, /restart or quit/);
  assert.equal(line.ok, true);
});

test('a completed check reads as up to date — REQ-011 hides nothing else here', () => {
  const line = updateStatusLine(packaged, { downloadedVersion: null, lastCheckAt: Date.now() - 60_000 });
  assert.match(line.text, /^Up to date · checked /);
  assert.equal(line.ok, true);
});

test('before any check completes, the schedule is stated instead', () => {
  const line = updateStatusLine(packaged, { downloadedVersion: null, lastCheckAt: null });
  assert.match(line.text, /on launch and every 4 hours/);
  assert.equal(line.ok, false);
});
