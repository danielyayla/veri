import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { VeriDocument } from '@veri/core';
import { parsePaletteQuery, rankDocs, relatedIds } from './search.ts';

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

// ---- related: — the 1-hop neighborhood filter (WO-048, SRC-022) ----

const HOOD_DOCS: VeriDocument[] = [
  // WO-028's outbound: REQ-011 via frontmatter, DEC-002 via inline [[ref]].
  doc({
    id: 'WO-028',
    type: 'work-order',
    title: 'Packaged releases',
    status: 'in-progress',
    links: [{ id: 'REQ-011', rel: 'implements' }],
    body: 'Auto-update rides [[DEC-002]].',
    inlineRefs: ['DEC-002'],
  }),
  doc({ id: 'REQ-011', type: 'requirement', title: 'Installable distribution', status: 'accepted' }),
  doc({ id: 'DEC-002', type: 'decision', title: 'Files are the source of truth', status: 'active' }),
  // Inbound: SRC-016 mentions WO-028 inline; WO-044 links it in frontmatter.
  doc({
    id: 'SRC-016',
    type: 'source',
    title: 'Design critique',
    status: 'imported',
    body: 'What touches [[WO-028]]?',
    inlineRefs: ['WO-028'],
  }),
  doc({
    id: 'WO-044',
    type: 'work-order',
    title: 'Receipt verification',
    status: 'done',
    links: [{ id: 'WO-028', rel: 'extends' }],
  }),
  // Two hops out — never in the 1-hop neighborhood.
  doc({
    id: 'DEC-030',
    type: 'decision',
    title: 'Two hops away',
    status: 'active',
    links: [{ id: 'REQ-011', rel: 'constrains' }],
  }),
];

test('parse strips related: into its own field, case-insensitively', () => {
  const q = parsePaletteQuery('related:WO-028 gate');
  assert.equal(q.related, 'wo-028');
  assert.equal(q.text, 'gate');
  assert.equal(parsePaletteQuery('hello').related, null);
});

test('related: composes with type and status filters in one query', () => {
  const q = parsePaletteQuery('related:wo-028 wo: is:done');
  assert.equal(q.related, 'wo-028');
  assert.equal(q.type, 'work-order');
  assert.deepEqual(q.statuses, ['done']);
});

test('relatedIds is the 1-hop neighborhood plus the id itself, both directions', () => {
  assert.deepEqual(
    [...relatedIds(HOOD_DOCS, 'wo-028')].sort(),
    ['dec-002', 'req-011', 'src-016', 'wo-028', 'wo-044'],
  );
});

test('related:WO-028 lists exactly the neighborhood, at base score for empty text', () => {
  const hits = rankDocs(HOOD_DOCS, parsePaletteQuery('related:WO-028'));
  assert.deepEqual(hits.map((h) => h.id), ['DEC-002', 'REQ-011', 'SRC-016', 'WO-028', 'WO-044']);
  assert.ok(hits.every((h) => h.score === 1));
});

test('related: composes with is: and free text', () => {
  const active = rankDocs(HOOD_DOCS, parsePaletteQuery('related:WO-028 is:active'));
  assert.deepEqual(active.map((h) => h.id).sort(), ['DEC-002', 'REQ-011', 'WO-028']);
  const text = rankDocs(HOOD_DOCS, parsePaletteQuery('related:WO-028 receipt'));
  assert.deepEqual(text.map((h) => h.id), ['WO-044']);
});

test('an unknown related: id yields zero hits, never an error', () => {
  assert.deepEqual(rankDocs(HOOD_DOCS, parsePaletteQuery('related:WO-999')), []);
  assert.deepEqual(rankDocs(HOOD_DOCS, parsePaletteQuery('related:')), []);
  assert.deepEqual([...relatedIds(HOOD_DOCS, 'wo-999')], []);
});

test('a superseded-by pointer counts as a frontmatter edge, like the Connections panel', () => {
  const docs = [
    doc({ id: 'DEC-001', type: 'decision', title: 'Old way', status: 'superseded', supersededBy: 'DEC-002' }),
    doc({ id: 'DEC-002', type: 'decision', title: 'New way', status: 'active' }),
  ];
  assert.deepEqual([...relatedIds(docs, 'dec-001')].sort(), ['dec-001', 'dec-002']);
  assert.deepEqual([...relatedIds(docs, 'dec-002')].sort(), ['dec-001', 'dec-002']);
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
