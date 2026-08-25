import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { VeriDocument } from '@verikb/core';
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
    assert.equal(hits[0].score, 1000);
    assert.deepEqual(hits[0].matched, ['id']);
  }
});

test('rank tiers: id prefix > title match > body match', () => {
  const prefix = rankDocs(DOCS, parsePaletteQuery('dec'));
  assert.deepEqual(prefix.map((h) => h.id), ['DEC-002', 'DEC-005']);
  assert.ok(prefix.every((h) => h.score === 800));

  const hits = rankDocs(DOCS, parsePaletteQuery('pdf export'));
  // Both terms whole words in both titles, full phrase starts both titles.
  assert.deepEqual(hits.map((h) => h.id), ['REQ-014', 'WO-002']);
  assert.ok(hits.every((h) => h.score === 250)); // 100 + 100 + 50 phrase-start
  assert.ok(hits.every((h) => h.matched.length === 1 && h.matched[0] === 'title'));

  const contains = rankDocs(DOCS, parsePaletteQuery('export'));
  assert.ok(contains.every((h) => h.score === 125)); // 100 whole word + 25 phrase-contain
});

test('body match scores lowest and carries a one-line snippet', () => {
  const hits = rankDocs(DOCS, parsePaletteQuery('auth token'));
  assert.equal(hits.length, 1);
  assert.equal(hits[0].id, 'WO-003');
  assert.equal(hits[0].score, 80); // two whole-word body terms, 40 each
  assert.deepEqual(hits[0].matched, ['body']);
  assert.ok(hits[0].snippet !== null && hits[0].snippet.includes('auth token flow'));
  assert.ok(!hits[0].snippet.includes('\n'), 'snippet collapses newlines');
});

// ---- Ranked multi-term scoring (WO-090) ----------------------------------

const RANK_DOCS: VeriDocument[] = [
  doc({ id: 'REQ-101', type: 'requirement', title: 'Ledger export rules', status: 'accepted' }),
  doc({ id: 'REQ-102', type: 'requirement', title: 'Quarterly report', status: 'accepted', body: 'The ledger export feeds it.' }),
  doc({ id: 'REQ-103', type: 'requirement', title: 'Ledgering conventions', status: 'accepted' }),
  doc({ id: 'REQ-104', type: 'requirement', title: 'Archival', status: 'accepted', body: 'Only the ledger is archived.' }),
];

test('a title hit outranks a body-only hit for the same term', () => {
  const hits = rankDocs(RANK_DOCS, parsePaletteQuery('export'));
  assert.equal(hits[0].id, 'REQ-101');
  assert.deepEqual(hits[0].matched, ['title']);
  assert.equal(hits[1].id, 'REQ-102');
  assert.deepEqual(hits[1].matched, ['body']);
  assert.ok(hits[0].score > hits[1].score);
});

test('a whole-word match outranks a bare substring at the same tier', () => {
  const hits = rankDocs(RANK_DOCS, parsePaletteQuery('ledger'));
  const word = hits.find((h) => h.id === 'REQ-101')!; // "Ledger" whole word
  const substring = hits.find((h) => h.id === 'REQ-103')!; // "Ledgering"
  assert.ok(word.score > substring.score);
});

test('multi-term queries AND-match: every term must land, scores sum per term', () => {
  const hits = rankDocs(RANK_DOCS, parsePaletteQuery('ledger export'));
  // REQ-103 and REQ-104 have ledger but not export — dropped by AND.
  assert.deepEqual(hits.map((h) => h.id), ['REQ-101', 'REQ-102']);
  // Two matched terms beat the same document's single-term score.
  const single = rankDocs(RANK_DOCS, parsePaletteQuery('ledger')).find((h) => h.id === 'REQ-101')!;
  assert.ok(hits[0].score > single.score, 'multi-term beats single-term');
});

test('terms may land in different fields; matched names each field', () => {
  const docs = [doc({ id: 'WO-101', type: 'work-order', title: 'Ledger rework', status: 'backlog', body: 'Blocks the export.' })];
  const hits = rankDocs(docs, parsePaletteQuery('ledger export'));
  assert.equal(hits.length, 1);
  assert.deepEqual(hits[0].matched, ['title', 'body']);
  assert.ok(hits[0].snippet !== null && hits[0].snippet.includes('export'));
});

test('backward compatibility: every full-phrase substring hit is still a hit', () => {
  // Old behavior matched "auth token" as one substring; term-splitting must
  // keep that hit (and may add docs matching the terms apart).
  const phrase = rankDocs(DOCS, parsePaletteQuery('auth token'));
  assert.ok(phrase.some((h) => h.id === 'WO-003'));
  const titlePhrase = rankDocs(DOCS, parsePaletteQuery('pdf export'));
  assert.ok(titlePhrase.some((h) => h.id === 'REQ-014') && titlePhrase.some((h) => h.id === 'WO-002'));
});

test('ordering is deterministic and independent of document load order', () => {
  const reversed = [...RANK_DOCS].reverse();
  for (const raw of ['ledger', 'ledger export', 'req', '']) {
    const q = parsePaletteQuery(raw);
    assert.equal(JSON.stringify(rankDocs(reversed, q)), JSON.stringify(rankDocs(RANK_DOCS, q)));
  }
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
  assert.equal(hits[0].score, 137); // 125 + 12
  const later = rankDocs(DOCS, parsePaletteQuery('export'), ['X', 'X', 'X', 'X', 'X', 'X', 'WO-002']);
  assert.equal(later.find((h) => h.id === 'WO-002')?.score, 125); // boost fades to zero
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

// ---- Dogfood: ranked search over this repository's own corpus (WO-090) ---

test('a title-word query on the dogfood corpus ranks title hits first with full recall', async () => {
  const { loadProject } = await import('@verikb/core');
  const { documents } = await loadProject(new URL('../../../veri', import.meta.url));
  const needle = 'brownfield';
  const hits = rankDocs(documents, parsePaletteQuery(needle));

  // Full recall: every substring hit of the old scan is still returned.
  const substringIds = documents
    .filter((d) => d.title.toLowerCase().includes(needle) || d.body.toLowerCase().includes(needle))
    .map((d) => d.id)
    .sort();
  assert.deepEqual(hits.map((h) => h.id).sort(), substringIds);
  assert.ok(hits.length > 1, 'expected both title and body hits in the corpus');

  // Ranking: every title-matching document sits above every body-only match.
  const lastTitle = hits.map((h) => h.matched.includes('title')).lastIndexOf(true);
  const firstBodyOnly = hits.findIndex((h) => !h.matched.includes('title'));
  assert.ok(hits[0].matched.includes('title'), 'top hit must match on title');
  assert.ok(firstBodyOnly === -1 || lastTitle < firstBodyOnly, 'a body-only hit outranked a title hit');

  // Determinism: two runs over the same files are byte-identical.
  const again = rankDocs(await loadProject(new URL('../../../veri', import.meta.url)).then((p) => p.documents), parsePaletteQuery(needle));
  assert.equal(JSON.stringify(hits), JSON.stringify(again));
});

test('palette zero-strip is prefix-anchored: req14 never matches REQ-1004 (WO-050)', () => {
  const docs = [...DOCS, doc({ id: 'REQ-1004', type: 'requirement', title: 'Wide id', status: 'draft' })];
  const hits14 = rankDocs(docs, parsePaletteQuery('req14'));
  assert.equal(hits14[0].id, 'REQ-014');
  assert.equal(hits14[0].score, 1000);
  assert.ok(!hits14.some((h) => h.id === 'REQ-1004'));
  const hits1004 = rankDocs(docs, parsePaletteQuery('req1004'));
  assert.equal(hits1004[0].id, 'REQ-1004');
  assert.equal(hits1004[0].score, 1000);
});
