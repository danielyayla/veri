import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { VeriDocument } from '@veri/core';
import { parsePaletteQuery, rankDocs } from './search.ts';

function doc(partial: Partial<VeriDocument> & Pick<VeriDocument, 'id' | 'type' | 'title' | 'status'>): VeriDocument {
  return {
    created: '2026-08-01',
    updated: '2026-08-01',
    links: [],
    frontmatter: {},
    body: '',
    file: `${partial.id}.md`,
    inlineRefs: [],
    ...partial,
  };
}

const DOCS: VeriDocument[] = [
  doc({ id: 'REQ-001', type: 'requirement', title: 'Invoice CRUD', status: 'accepted' }),
  doc({ id: 'REQ-014', type: 'requirement', title: 'PDF export with templates', status: 'draft' }),
  doc({ id: 'DEC-005', type: 'decision', title: 'Typst for PDF rendering', status: 'active' }),
  doc({ id: 'DEC-002', type: 'decision', title: 'Tauri over Electron', status: 'superseded' }),
  doc({ id: 'WO-002', type: 'work-order', title: 'PDF export pipeline', status: 'in-progress' }),
  doc({
    id: 'WO-003',
    type: 'work-order',
    title: 'CSV time import',
    status: 'backlog',
    body: 'Imports rely on the auth token flow shipped earlier.\nSee notes.',
  }),
  doc({ id: 'WO-004', type: 'work-order', title: 'Client manager', status: 'done' }),
  doc({ id: 'SRC-001', type: 'source', title: 'Client interviews', status: 'imported' }),
];

test('parse strips composable filter prefixes from the free text', () => {
  const q = parsePaletteQuery('wo: is:backlog auth');
  assert.equal(q.type, 'work-order');
  assert.deepEqual(q.statuses, ['backlog']);
  assert.equal(q.text, 'auth');
});

test('parse normalizes is: values to letters only', () => {
  assert.deepEqual(parsePaletteQuery('is:in-progress').statuses, ['inprogress']);
});

test('exact id matches with or without zero-padding and ranks first', () => {
  for (const raw of ['req14', 'REQ-014', 'req014']) {
    const hits = rankDocs(DOCS, parsePaletteQuery(raw));
    assert.equal(hits[0].id, 'REQ-014', `query ${raw}`);
    assert.equal(hits[0].score, 100);
  }
});

test('rank tiers: id prefix > title starts-with > title contains > body', () => {
  const prefix = rankDocs(DOCS, parsePaletteQuery('dec'));
  assert.deepEqual(prefix.map((h) => h.id), ['DEC-002', 'DEC-005']);
  assert.ok(prefix.every((h) => h.score === 80));

  const hits = rankDocs(DOCS, parsePaletteQuery('pdf export'));
  // Title starts-with (REQ-014, WO-002 both start "PDF export…") beats contains.
  assert.deepEqual(hits.map((h) => h.id), ['REQ-014', 'WO-002']);
  assert.ok(hits.every((h) => h.score === 62));

  const contains = rankDocs(DOCS, parsePaletteQuery('export'));
  assert.ok(contains.every((h) => h.score === 55));
});

test('body match scores lowest and carries a one-line snippet', () => {
  const hits = rankDocs(DOCS, parsePaletteQuery('auth token'));
  assert.equal(hits.length, 1);
  assert.equal(hits[0].id, 'WO-003');
  assert.equal(hits[0].score, 30);
  assert.ok(hits[0].snippet !== null && hits[0].snippet.includes('auth token flow'));
  assert.ok(!hits[0].snippet.includes('\n'), 'snippet collapses newlines');
});

test('filters compose and drop non-matching docs', () => {
  const hits = rankDocs(DOCS, parsePaletteQuery('wo: is:backlog auth'));
  assert.deepEqual(hits.map((h) => h.id), ['WO-003']);
});

test('is:active means living: draft, accepted, active, backlog, in-progress', () => {
  const hits = rankDocs(DOCS, parsePaletteQuery('is:active'));
  assert.deepEqual(
    hits.map((h) => h.id).sort(),
    ['DEC-005', 'REQ-001', 'REQ-014', 'WO-002', 'WO-003'],
  );
});

test('empty text lists every filter-surviving doc at base score', () => {
  const hits = rankDocs(DOCS, parsePaletteQuery('wo:'));
  assert.deepEqual(hits.map((h) => h.id), ['WO-002', 'WO-003', 'WO-004']);
  assert.ok(hits.every((h) => h.score === 1));
});

test('recently opened docs get a fading rank boost', () => {
  const hits = rankDocs(DOCS, parsePaletteQuery('export'), ['WO-002']);
  assert.equal(hits[0].id, 'WO-002');
  assert.equal(hits[0].score, 67); // 55 + 12
  const later = rankDocs(DOCS, parsePaletteQuery('export'), ['X', 'X', 'X', 'X', 'X', 'X', 'WO-002']);
  assert.equal(later.find((h) => h.id === 'WO-002')?.score, 55); // boost fades to zero
});

test('is:proposed means awaiting review: proposed decisions and draft requirements (SRC-006)', () => {
  const pendingDocs = [
    doc({ id: 'REQ-020', type: 'requirement', title: 'Draft req', status: 'draft' }),
    doc({ id: 'REQ-021', type: 'requirement', title: 'Accepted req', status: 'accepted' }),
    doc({ id: 'DEC-020', type: 'decision', title: 'Proposed dec', status: 'proposed' }),
    doc({ id: 'DEC-021', type: 'decision', title: 'Active dec', status: 'active' }),
    doc({ id: 'WO-020', type: 'work-order', title: 'Backlog wo', status: 'backlog' }),
  ];
  assert.deepEqual(
    rankDocs(pendingDocs, parsePaletteQuery('is:proposed'))
      .map((h) => h.id)
      .sort(),
    ['DEC-020', 'REQ-020'],
  );
});

test('is:active treats proposed decisions as living', () => {
  const docs = [
    doc({ id: 'DEC-020', type: 'decision', title: 'Proposed dec', status: 'proposed' }),
    doc({ id: 'DEC-021', type: 'decision', title: 'Superseded dec', status: 'superseded' }),
  ];
  assert.deepEqual(
    rankDocs(docs, parsePaletteQuery('dec: is:active')).map((h) => h.id),
    ['DEC-020'],
  );
});
