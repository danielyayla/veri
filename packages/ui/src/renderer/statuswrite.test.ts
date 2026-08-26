/** The status control's write policy (WO-111, SRC-051): leaving `ready` is
    as deliberate as entering it, on both input paths, and no status write
    fails silently. Pure — no DOM; the keyboard path is modeled through the
    same rove helpers the radiogroup uses. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { segmentRefusal, writeStatus } from './statuswrite.ts';
import { roveIndex, roveKey } from './a11y.ts';

const SEGMENTS = ['backlog', 'ready', 'in-progress', 'done'];

test('click path: on a ready work order every other segment refuses with a reason', () => {
  assert.match(segmentRefusal('ready', 'backlog')!, /discards the approval stamp/);
  assert.match(segmentRefusal('ready', 'backlog')!, /git/);
  assert.match(segmentRefusal('ready', 'in-progress')!, /veri start/);
  assert.match(segmentRefusal('ready', 'done')!, /veri start/);
  // The active segment itself is a no-op, not a refusal.
  assert.equal(segmentRefusal('ready', 'ready'), null);
});

test('keyboard path: on a ready work order, ← from the focused ready segment then Space refuses', () => {
  // The radiogroup roves with the a11y helpers; on a ready work order the
  // `ready` segment holds tabindex=0 and focus. ← moves to backlog, and
  // Space is native button activation on that segment — the same handler a
  // click reaches, deciding by the same table.
  const focused = SEGMENTS.indexOf('ready');
  const move = roveKey('ArrowLeft');
  assert.equal(move, 'prev');
  const landed = roveIndex(SEGMENTS.length, focused, move!);
  assert.equal(SEGMENTS[landed], 'backlog');
  assert.match(segmentRefusal('ready', SEGMENTS[landed]!)!, /discards the approval stamp/);
  // → then Space is the in-progress demotion; wrapping further reaches done.
  const right = roveIndex(SEGMENTS.length, focused, roveKey('ArrowRight')!);
  assert.match(segmentRefusal('ready', SEGMENTS[right]!)!, /veri start/);
});

test('entry stays gated: ready is never a write target from any status (WO-103, DEC-096)', () => {
  for (const from of ['backlog', 'in-progress', 'done']) {
    assert.match(segmentRefusal(from, 'ready')!, /veri approve/);
  }
});

test('ordinary transitions still write: nothing else is gated', () => {
  assert.equal(segmentRefusal('backlog', 'in-progress'), null);
  assert.equal(segmentRefusal('backlog', 'done'), null);
  assert.equal(segmentRefusal('in-progress', 'done'), null);
  assert.equal(segmentRefusal('in-progress', 'backlog'), null);
  assert.equal(segmentRefusal('done', 'in-progress'), null);
  assert.equal(segmentRefusal('done', 'backlog'), null);
});

test('writeStatus: success runs done and never refused', async () => {
  const calls: string[] = [];
  let doneRan = false;
  await writeStatus(
    async (id, status) => {
      calls.push(`${id}:${status}`);
    },
    'WO-001',
    'done',
    () => {
      doneRan = true;
    },
    () => assert.fail('refused must not run on success'),
  );
  assert.deepEqual(calls, ['WO-001:done']);
  assert.equal(doneRan, true);
});

test('writeStatus: a refusal surfaces its reason instead of vanishing (WO-111)', async () => {
  // The writable-status guard's exact shape: setStatus rejects, e.g. when a
  // revert targets `ready`, which the UI may never write (write.ts).
  let surfaced: string | null = null;
  await writeStatus(
    () => Promise.reject(new Error('"ready" is not a valid work-order status (expected backlog | in-progress | done)')),
    'WO-001',
    'ready',
    () => assert.fail('done must not run on refusal'),
    (message) => {
      surfaced = message;
    },
  );
  assert.match(surfaced!, /"ready" is not a valid work-order status/);
});

test('writeStatus: IPC framing is stripped from the surfaced reason', async () => {
  let surfaced = '';
  await writeStatus(
    () => Promise.reject(new Error("Error invoking remote method 'set-status': Error: no document with id WO-999")),
    'WO-999',
    'done',
    () => assert.fail('done must not run on refusal'),
    (message) => {
      surfaced = message;
    },
  );
  assert.equal(surfaced, 'no document with id WO-999');
});

// ---- the withdrawn gate (WO-110, SRC-052) ----

test('on a withdrawn work order every segment refuses — restoring is a git act', () => {
  for (const target of ['backlog', 'ready', 'in-progress', 'done']) {
    const refusal = segmentRefusal('withdrawn', target);
    assert.match(refusal!, /withdrawn work order is terminal/, `target ${target}`);
    assert.match(refusal!, /git/, `target ${target}`);
  }
});
