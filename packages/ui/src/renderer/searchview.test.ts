import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { PaletteHit } from '@verikb/mcp';
import { SEARCH_MAX_ROWS, boldSegments, searchRows } from './searchview.ts';

function hit(id: string, snippet: string | null = null): PaletteHit {
  return { id, type: 'work-order', status: 'backlog', title: id, score: 30, matched: ['body'], snippet };
}

// ---- render cap (WO-048, SRC-022: "results render the top 200") ----

test('at or under the cap, every hit renders and there is no refine line', () => {
  const hits = Array.from({ length: SEARCH_MAX_ROWS }, (_, i) => hit(`WO-${i}`));
  const list = searchRows(hits);
  assert.equal(list.rows.length, SEARCH_MAX_ROWS);
  assert.equal(list.more, 0);
});

test('over the cap, the top 200 render in rank order plus the overflow count', () => {
  const hits = Array.from({ length: 347 }, (_, i) => hit(`WO-${i}`));
  const list = searchRows(hits);
  assert.equal(list.rows.length, SEARCH_MAX_ROWS);
  assert.equal(list.rows[0].id, 'WO-0'); // rank order preserved, unsliced scores
  assert.equal(list.more, 147); // "147 more — refine the query"
});

test('zero hits renders zero rows', () => {
  assert.deepEqual(searchRows([]), { rows: [], more: 0 });
});

// ---- snippet bolding ("the matched-line snippet with the match bolded") ----

test('the match bolds inside the snippet, case-insensitively', () => {
  assert.deepEqual(boldSegments('…the Auth token flow…', 'auth token'), [
    { text: '…the ', bold: false },
    { text: 'Auth token', bold: true },
    { text: ' flow…', bold: false },
  ]);
});

test('every occurrence bolds, and adjacent segments partition the text', () => {
  const segs = boldSegments('gate after gate', 'gate');
  assert.deepEqual(segs, [
    { text: 'gate', bold: true },
    { text: ' after ', bold: false },
    { text: 'gate', bold: true },
  ]);
  assert.equal(segs.map((s) => s.text).join(''), 'gate after gate');
});

test('an empty needle or a miss leaves one plain segment', () => {
  assert.deepEqual(boldSegments('plain line', ''), [{ text: 'plain line', bold: false }]);
  assert.deepEqual(boldSegments('plain line', 'zzz'), [{ text: 'plain line', bold: false }]);
  assert.deepEqual(boldSegments('', 'x'), []);
});
