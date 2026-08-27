import { test } from 'node:test';
import assert from 'node:assert/strict';
import { receiptsWindow } from './outcomes.ts';
import { OUTCOMES_RECEIPTS_WINDOW } from '../derive.ts';

// The RECENT RECEIPTS window (WO-119, SRC-054): the board's DONE posture.

test('at or under the window every receipt shows and no expander renders', () => {
  assert.deepEqual(receiptsWindow(0, false), { count: 0, expander: null });
  assert.deepEqual(receiptsWindow(OUTCOMES_RECEIPTS_WINDOW, false), {
    count: OUTCOMES_RECEIPTS_WINDOW,
    expander: null,
  });
  // Session state can't force an expander that has nothing to hide.
  assert.deepEqual(receiptsWindow(3, true), { count: 3, expander: null });
});

test('over the window, closed shows the window and offers the full count', () => {
  const win = receiptsWindow(12, false);
  assert.equal(win.count, OUTCOMES_RECEIPTS_WINDOW);
  assert.equal(win.expander, '▸ show all 12 receipts');
});

test('over the window, open shows everything and offers to hide', () => {
  const win = receiptsWindow(12, true);
  assert.equal(win.count, 12);
  assert.equal(win.expander, '▾ hide receipts');
});
