import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { bridgeTarget } from './bridge.ts';

test('offers the feed version once the Tauri line exists', () => {
  assert.equal(bridgeTarget('0.1.8', { version: '0.2.0' }), '0.2.0');
  assert.equal(bridgeTarget('0.1.8', { version: 'v0.2.0' }), '0.2.0');
  assert.equal(bridgeTarget('0.1.8', { version: '1.0.0' }), '1.0.0');
});

test('absent or unparseable feed means no bridge yet', () => {
  assert.equal(bridgeTarget('0.1.8', null), null);
  assert.equal(bridgeTarget('0.1.8', undefined), null);
  assert.equal(bridgeTarget('0.1.8', 'Not Found'), null);
  assert.equal(bridgeTarget('0.1.8', {}), null);
  assert.equal(bridgeTarget('0.1.8', { version: 42 }), null);
  assert.equal(bridgeTarget('0.1.8', { version: 'latest' }), null);
});

test('never offers its own or an older version', () => {
  assert.equal(bridgeTarget('0.1.8', { version: '0.1.8' }), null);
  assert.equal(bridgeTarget('0.1.8', { version: '0.1.7' }), null);
  assert.equal(bridgeTarget('0.2.1', { version: '0.2.0' }), null);
});
