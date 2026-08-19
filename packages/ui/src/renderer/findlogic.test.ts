import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  clampFind,
  countLabel,
  currentIndex,
  findReduce,
  matchRanges,
  segmentMatches,
  stepFind,
} from './findlogic.ts';
import type { FindPart } from './findlogic.ts';

// ---- matchRanges: case-insensitive substring over one string ----

test('matchRanges finds case-insensitive substring matches with offsets', () => {
  assert.deepEqual(matchRanges('Veri makes veri docs. VERI!', 'veri'), [
    { from: 0, to: 4 },
    { from: 11, to: 15 },
    { from: 22, to: 26 },
  ]);
  assert.deepEqual(matchRanges('The Query', 'qUeRy'), [{ from: 4, to: 9 }]);
});

test('matchRanges: empty query and missing needle match nothing', () => {
  assert.deepEqual(matchRanges('anything', ''), []);
  assert.deepEqual(matchRanges('', 'x'), []);
  assert.deepEqual(matchRanges('abc', 'zzz'), []);
});

test('matchRanges is non-overlapping, like CM6 highlight/matchAll', () => {
  // "aaa" holds one "aa" when each match resumes after the previous one.
  assert.deepEqual(matchRanges('aaa', 'aa'), [{ from: 0, to: 2 }]);
  // Adjacent matches still both count.
  assert.deepEqual(matchRanges('abab', 'ab'), [
    { from: 0, to: 2 },
    { from: 2, to: 4 },
  ]);
});

// ---- segmentMatches: the rendered-text walk feed ----

const part = (text: string, breakBefore = false): FindPart => ({ text, breakBefore });

test('segmentMatches maps hits back to (part, offset) pairs', () => {
  const parts = [part('one two'), part(' two three')];
  assert.deepEqual(segmentMatches(parts, 'two'), [
    { start: { seg: 0, off: 4 }, end: { seg: 0, off: 7 } },
    { start: { seg: 1, off: 1 }, end: { seg: 1, off: 4 } },
  ]);
});

test('a match spans inline part boundaries', () => {
  // "foo **bar**" renders as "foo " + "bar" in two text nodes, one block.
  const parts = [part('foo '), part('bar')];
  assert.deepEqual(segmentMatches(parts, 'foo bar'), [
    { start: { seg: 0, off: 0 }, end: { seg: 1, off: 3 } },
  ]);
});

test('a match never crosses a block boundary', () => {
  // "…heading" then "paragraph…" in separate blocks: no "ngpa" bleed.
  const parts = [part('a heading'), part('paragraph text', true)];
  assert.deepEqual(segmentMatches(parts, 'ngpa'), []);
  // Within each block, matching still works.
  assert.equal(segmentMatches(parts, 'heading').length, 1);
  assert.equal(segmentMatches(parts, 'paragraph').length, 1);
});

test('a match ending exactly at a part boundary closes on that part', () => {
  const parts = [part('end'), part(' next')];
  assert.deepEqual(segmentMatches(parts, 'end'), [
    { start: { seg: 0, off: 0 }, end: { seg: 0, off: 3 } },
  ]);
});

test('segmentMatches: empty parts, empty query, and separator queries', () => {
  assert.deepEqual(segmentMatches([], 'x'), []);
  assert.deepEqual(segmentMatches([part('x')], ''), []);
  // The joiner is \n; a query carrying one (impossible from the single-line
  // input) must not match the synthetic separator.
  assert.deepEqual(segmentMatches([part('a'), part('b', true)], 'a\nb'), []);
});

test('leading breakBefore on the first part adds no separator', () => {
  assert.deepEqual(segmentMatches([part('abc', true)], 'abc'), [
    { start: { seg: 0, off: 0 }, end: { seg: 0, off: 3 } },
  ]);
});

// ---- wrap-around index math ----

test('stepFind wraps in both directions', () => {
  assert.equal(stepFind(0, 3, 1), 1);
  assert.equal(stepFind(2, 3, 1), 0);
  assert.equal(stepFind(0, 3, -1), 2);
  assert.equal(stepFind(1, 3, -1), 0);
  assert.equal(stepFind(0, 0, 1), 0);
  assert.equal(stepFind(0, 1, 1), 0);
});

test('clampFind follows a shrinking match set', () => {
  assert.equal(clampFind(5, 3), 2);
  assert.equal(clampFind(1, 3), 1);
  assert.equal(clampFind(2, 0), 0);
  assert.equal(clampFind(-1, 3), 0);
});

test('countLabel renders 1-based, 0/0 when empty', () => {
  assert.equal(countLabel(2, 17), '3/17');
  assert.equal(countLabel(0, 1), '1/1');
  assert.equal(countLabel(0, 0), '0/0');
  assert.equal(countLabel(9, 3), '3/3'); // stale cursor clamps
});

test('currentIndex: exact selection hit, else the count of matches before', () => {
  const ranges = [
    { from: 0, to: 2 },
    { from: 10, to: 12 },
    { from: 20, to: 22 },
  ];
  assert.equal(currentIndex(ranges, 10, 12), 1);
  assert.equal(currentIndex(ranges, 20, 22), 2);
  // CM6 landed between our non-overlapping matches: count those before it.
  assert.equal(currentIndex(ranges, 15, 17), 2);
  assert.equal(currentIndex(ranges, 0, 1), 0);
  assert.equal(currentIndex([], 5, 6), 0);
});

// ---- the bar's state machine ----

test('open starts empty and is idempotent over an open bar', () => {
  assert.deepEqual(findReduce(null, { type: 'open' }), { query: '', current: 0 });
  // Reopen keeps the previous query of this bar instance (SRC-029).
  const open = { query: 'veri', current: 3 };
  assert.equal(findReduce(open, { type: 'open' }), open);
});

test('close clears; events on a closed bar stay closed', () => {
  assert.equal(findReduce({ query: 'q', current: 1 }, { type: 'close' }), null);
  assert.equal(findReduce(null, { type: 'query', query: 'x' }), null);
  assert.equal(findReduce(null, { type: 'step', dir: 1, total: 5 }), null);
  assert.equal(findReduce(null, { type: 'clamp', total: 5 }), null);
});

test('a query edit resets the cursor to the first match', () => {
  assert.deepEqual(findReduce({ query: 've', current: 4 }, { type: 'query', query: 'ver' }), {
    query: 'ver',
    current: 0,
  });
});

test('step wraps; clamp keeps the cursor inside the match set', () => {
  const s = { query: 'v', current: 2 };
  assert.deepEqual(findReduce(s, { type: 'step', dir: 1, total: 3 }), { query: 'v', current: 0 });
  assert.deepEqual(findReduce(s, { type: 'step', dir: -1, total: 3 }), { query: 'v', current: 1 });
  assert.deepEqual(findReduce(s, { type: 'step', dir: 1, total: 0 }), { query: 'v', current: 0 });
  assert.deepEqual(findReduce({ query: 'v', current: 9 }, { type: 'clamp', total: 4 }), { query: 'v', current: 3 });
  assert.deepEqual(findReduce({ query: 'v', current: 1 }, { type: 'clamp', total: 0 }), { query: 'v', current: 0 });
});
