import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { PaletteHit, PaletteQuery, PaletteResult } from '@veri/mcp';
import { PALETTE_MAX_ROWS, paletteRows } from './palette.ts';
import { VIEW_META } from './tabs.ts';

function hit(id: string, score: number): PaletteHit {
  return { id, type: 'work-order', status: 'backlog', title: id, score, snippet: null };
}

function result(query: Partial<PaletteQuery>, hits: PaletteHit[]): PaletteResult {
  return { query: { text: '', type: null, statuses: [], related: null, ...query }, hits };
}

test('typing a view name surfaces the view row among doc hits by score', () => {
  const rows = paletteRows(result({ text: 'board' }, [hit('WO-001', 62), hit('WO-002', 55)]));
  assert.deepEqual(
    rows.map((r) => (r.kind === 'view' ? r.view : r.kind === 'doc' ? r.hit.id : r.label)),
    ['WO-001', 'board', 'WO-002'],
  );
});

test('partial label matches surface views ("agent" → Settings, via its alias)', () => {
  const rows = paletteRows(result({ text: 'agent' }, []));
  assert.deepEqual(rows.map((r) => (r.kind === 'view' ? r.view : '')), ['settings']);
});

test('view rows are suppressed while a type or status filter is active', () => {
  const withType = paletteRows(result({ text: 'board', type: 'work-order' }, [hit('WO-001', 55)]));
  assert.ok(withType.every((r) => r.kind === 'doc'));
  const withStatus = paletteRows(result({ text: 'board', statuses: ['done'] }, []));
  assert.equal(withStatus.length, 0);
});

test('empty query lists views below docs and caps the list at 8', () => {
  const hits = Array.from({ length: 10 }, (_, i) => hit(`WO-00${i}`, 1));
  const rows = paletteRows(result({}, hits));
  assert.equal(rows.length, PALETTE_MAX_ROWS);
  // >8 doc hits: the last row is the overflow door (WO-048); docs above it.
  assert.ok(rows.slice(0, -1).every((r) => r.kind === 'doc'), 'score-1 docs outrank score-0.5 views');
  assert.deepEqual(rows[PALETTE_MAX_ROWS - 1], { kind: 'overflow', count: 10 });
  const few = paletteRows(result({}, [hit('WO-001', 1)]));
  assert.equal(few.length, 1 + Object.keys(VIEW_META).length); // 1 doc + every view
  assert.equal(few[0].kind, 'doc');
});

// ---- overflow row (WO-048, SRC-022) ----

test('more doc hits than the cap turns the last row into "See all N results"', () => {
  const hits = Array.from({ length: 23 }, (_, i) => hit(`WO-${String(i).padStart(3, '0')}`, 55));
  const rows = paletteRows(result({ text: 'export' }, hits));
  assert.equal(rows.length, PALETTE_MAX_ROWS);
  assert.deepEqual(rows[PALETTE_MAX_ROWS - 1], { kind: 'overflow', count: 23 });
  assert.ok(rows.slice(0, -1).every((r) => r.kind === 'doc'));
});

test('exactly 8 hits or fewer shows no overflow row — the cap is untouched', () => {
  const eight = paletteRows(result({ text: 'x' }, Array.from({ length: 8 }, (_, i) => hit(`WO-00${i}`, 55))));
  assert.ok(eight.every((r) => r.kind !== 'overflow'));
  assert.equal(eight.filter((r) => r.kind === 'doc').length, 8);
});

test('the overflow row appears under an active filter too', () => {
  const hits = Array.from({ length: 9 }, (_, i) => hit(`WO-00${i}`, 1));
  const rows = paletteRows(result({ type: 'work-order' }, hits));
  assert.deepEqual(rows[PALETTE_MAX_ROWS - 1], { kind: 'overflow', count: 9 });
});

test('a related: filter suppresses view and command rows like other filters', () => {
  const rows = paletteRows(result({ text: 'board', related: 'wo-028' }, [hit('WO-001', 55)]));
  assert.ok(rows.every((r) => r.kind === 'doc'));
});

// ---- command rows (WO-018, SRC-007) ----

function commands(rows: ReturnType<typeof paletteRows>): string[] {
  return rows.filter((r) => r.kind === 'command').map((r) => (r.kind === 'command' ? r.command : ''));
}

test('the new-project command matches its terms, whole or partial', () => {
  for (const text of ['new', 'project', 'create', 'proj', 'n']) {
    assert.deepEqual(commands(paletteRows(result({ text }, []))), ['new-project'], `query "${text}"`);
  }
});

test('an unrelated query does not surface the new-project command', () => {
  assert.deepEqual(commands(paletteRows(result({ text: 'receipt' }, []))), []);
});

test('the empty palette stays a navigation surface — no command rows', () => {
  const rows = paletteRows(result({}, []));
  assert.deepEqual(commands(rows), []);
  assert.ok(rows.every((r) => r.kind === 'view'), 'views still fill the empty palette');
});

test('command rows are suppressed while a type or status filter is active', () => {
  assert.deepEqual(commands(paletteRows(result({ text: 'new', type: 'work-order' }, []))), []);
  assert.deepEqual(commands(paletteRows(result({ text: 'new', statuses: ['proposed'] }, []))), []);
});

test('a doc hit outranks the command row at equal-ish scores', () => {
  const rows = paletteRows(result({ text: 'new' }, [hit('WO-018', 62)]));
  assert.equal(rows[0]?.kind, 'doc');
});

test('the Settings view surfaces for its label and its section aliases (WO-036)', () => {
  const views = (rows: ReturnType<typeof paletteRows>): string[] =>
    rows.filter((r) => r.kind === 'view').map((r) => (r as { view: string }).view);
  assert.ok(views(paletteRows(result({ text: 'settings' }, []))).includes('settings'));
  assert.ok(views(paletteRows(result({ text: 'templ' }, []))).includes('settings'));
  assert.ok(views(paletteRows(result({ text: 'updates' }, []))).includes('settings'));
  assert.ok(!views(paletteRows(result({ text: 'settings', type: 'decision' }, []))).includes('settings'));
});
