import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { VeriDocument } from '@veri/core';
import { livingCount, panelList, pushRecent } from './sidebar.ts';

function doc(id: string, type: VeriDocument['type'], status: string, title = id): VeriDocument {
  return {
    id,
    type,
    title,
    status,
    created: '2026-08-01',
    updated: '2026-08-01',
    links: [],
    frontmatter: {},
    body: '',
    file: `${id}.md`,
    inlineRefs: [],
  };
}

const DOCS: VeriDocument[] = [
  doc('REQ-001', 'requirement', 'accepted'),
  doc('REQ-002', 'requirement', 'draft'),
  doc('REQ-003', 'requirement', 'retired'),
  doc('DEC-002', 'decision', 'superseded'),
  doc('DEC-001', 'decision', 'active'),
  doc('WO-001', 'work-order', 'done', 'Bootstrap the parser'),
  doc('WO-002', 'work-order', 'in-progress', 'Wire the graph'),
  doc('WO-003', 'work-order', 'backlog', 'Ship the panel'),
  doc('SRC-001', 'source', 'imported'),
];

test('sidebar collection counts are living, not total', () => {
  assert.equal(livingCount(DOCS, 'requirement'), 2);
  assert.equal(livingCount(DOCS, 'decision'), 1);
  assert.equal(livingCount(DOCS, 'work-order'), 2);
  assert.equal(livingCount(DOCS, 'source'), 1);
});

test('panel lists living newest-first with dead behind the expander', () => {
  const wo = panelList(DOCS, 'work-order', '', []);
  assert.deepEqual(wo.living.map((d) => d.id), ['WO-003', 'WO-002']);
  assert.deepEqual(wo.dead.map((d) => d.id), ['WO-001']);
  assert.equal(wo.total, 3);
  assert.deepEqual(wo.pinned, []);
});

test('sources have no lifecycle: everything is living, nothing is dead', () => {
  const src = panelList(DOCS, 'source', '', []);
  assert.deepEqual(src.living.map((d) => d.id), ['SRC-001']);
  assert.equal(src.dead.length, 0);
});

test('pinned docs float to the PINNED group in workspace order and leave the living list', () => {
  const wo = panelList(DOCS, 'work-order', '', ['WO-002', 'REQ-001']);
  assert.deepEqual(wo.pinned.map((d) => d.id), ['WO-002']);
  assert.deepEqual(wo.living.map((d) => d.id), ['WO-003']);
});

test('filter matches id and title across living and dead rows', () => {
  const byId = panelList(DOCS, 'work-order', 'wo-001', []);
  assert.deepEqual(byId.dead.map((d) => d.id), ['WO-001']);
  assert.equal(byId.living.length, 0);
  const byTitle = panelList(DOCS, 'work-order', 'panel', []);
  assert.deepEqual(byTitle.living.map((d) => d.id), ['WO-003']);
  // The header total stays unfiltered.
  assert.equal(byTitle.total, 3);
});

test('a filtered-out pin drops from the PINNED group', () => {
  const wo = panelList(DOCS, 'work-order', 'graph', ['WO-003']);
  assert.deepEqual(wo.pinned, []);
  assert.deepEqual(wo.living.map((d) => d.id), ['WO-002']);
});

test('proposed decisions are living — pending docs stay visible (SRC-006)', () => {
  const docs = [doc('DEC-001', 'decision', 'active'), doc('DEC-002', 'decision', 'proposed'), doc('DEC-003', 'decision', 'superseded')];
  const dec = panelList(docs, 'decision', '', []);
  assert.deepEqual(dec.living.map((d) => d.id), ['DEC-002', 'DEC-001']);
  assert.equal(livingCount(docs, 'decision'), 2);
});

test('pushRecent fronts, dedupes, and caps at 10', () => {
  assert.deepEqual(pushRecent(['A', 'B'], 'B'), ['B', 'A']);
  const ten = Array.from({ length: 10 }, (_, i) => `D${i}`);
  const next = pushRecent(ten, 'NEW');
  assert.equal(next.length, 10);
  assert.equal(next[0], 'NEW');
  assert.ok(!next.includes('D9'));
});
