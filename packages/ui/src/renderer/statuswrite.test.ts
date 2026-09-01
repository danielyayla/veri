/** The status control's write policy (WO-111, SRC-051 — narrowed by
    DEC-143/WO-143: the `ready` segment and its gates retired with the
    state), and no status write fails silently. Pure — no DOM; the keyboard
    path is modeled through the same rove helpers the radiogroup uses. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { segmentRefusal, writeStatus } from './statuswrite.ts';
import { roveIndex, roveKey } from './a11y.ts';

const SEGMENTS = ['backlog', 'in-progress', 'done'];

test('the active segment itself is a no-op, not a refusal', () => {
  for (const status of SEGMENTS) assert.equal(segmentRefusal(status, status), null);
});

test('ordinary transitions still write: the lifecycle segments are ungated (DEC-143)', () => {
  assert.equal(segmentRefusal('backlog', 'in-progress'), null);
  assert.equal(segmentRefusal('backlog', 'done'), null);
  assert.equal(segmentRefusal('in-progress', 'done'), null);
  assert.equal(segmentRefusal('in-progress', 'backlog'), null);
  assert.equal(segmentRefusal('done', 'in-progress'), null);
  assert.equal(segmentRefusal('done', 'backlog'), null);
});

test('keyboard path: the radiogroup roves over the three lifecycle segments', () => {
  // On an in-progress work order that segment holds tabindex=0 and focus;
  // ← lands on backlog, → on done — the same handler a click reaches.
  const focused = SEGMENTS.indexOf('in-progress');
  const left = roveIndex(SEGMENTS.length, focused, roveKey('ArrowLeft')!);
  assert.equal(SEGMENTS[left], 'backlog');
  const right = roveIndex(SEGMENTS.length, focused, roveKey('ArrowRight')!);
  assert.equal(SEGMENTS[right], 'done');
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
  // The writable-status guard's exact shape: setStatus rejects any status
  // outside the lifecycle vocabulary (write.ts).
  let surfaced: string | null = null;
  await writeStatus(
    () => Promise.reject(new Error('"shipped" is not a valid work-order status (expected backlog | in-progress | done)')),
    'WO-001',
    'shipped',
    () => assert.fail('done must not run on refusal'),
    (message) => {
      surfaced = message;
    },
  );
  assert.match(surfaced!, /"shipped" is not a valid work-order status/);
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
  for (const target of SEGMENTS) {
    const refusal = segmentRefusal('withdrawn', target);
    assert.match(refusal!, /withdrawn work order is terminal/, `target ${target}`);
    assert.match(refusal!, /git/, `target ${target}`);
  }
});
