import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { VeriDocument } from '@veri/core';
import { pushRecent, treeSection, visibleRecents } from './sidebar.ts';

function doc(id: string, type: VeriDocument['type'], status: string): VeriDocument {
  return {
    id,
    type,
    title: id,
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
  doc('WO-001', 'work-order', 'done'),
  doc('WO-002', 'work-order', 'in-progress'),
  doc('WO-003', 'work-order', 'backlog'),
  doc('SRC-001', 'source', 'imported'),
];

test('sections default to living docs with living/dead counts', () => {
  const req = treeSection(DOCS, 'requirement', false);
  assert.deepEqual(req.shown.map((d) => d.id), ['REQ-001', 'REQ-002']);
  assert.equal(req.livingCount, 2);
  assert.equal(req.deadCount, 1);

  const wo = treeSection(DOCS, 'work-order', false);
  assert.deepEqual(wo.shown.map((d) => d.id), ['WO-002', 'WO-003']);
  assert.equal(wo.deadCount, 1);
});

test('expanding a section shows dead docs in place, id-sorted', () => {
  const dec = treeSection(DOCS, 'decision', true);
  assert.deepEqual(dec.shown.map((d) => d.id), ['DEC-001', 'DEC-002']);
  assert.equal(dec.livingCount, 1);
});

test('sources have no lifecycle: everything is living, nothing is dead', () => {
  const src = treeSection(DOCS, 'source', false);
  assert.deepEqual(src.shown.map((d) => d.id), ['SRC-001']);
  assert.equal(src.livingCount, 1);
  assert.equal(src.deadCount, 0);
});

test('visible recents exclude pinned docs and cap at 8', () => {
  const recents = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
  assert.deepEqual(visibleRecents(recents, ['B']), ['A', 'C', 'D', 'E', 'F', 'G', 'H', 'I']);
});

test('pushRecent fronts, dedupes, and caps at 10', () => {
  assert.deepEqual(pushRecent(['A', 'B'], 'B'), ['B', 'A']);
  const ten = Array.from({ length: 10 }, (_, i) => `D${i}`);
  const next = pushRecent(ten, 'NEW');
  assert.equal(next.length, 10);
  assert.equal(next[0], 'NEW');
  assert.ok(!next.includes('D9'));
});

test('proposed decisions are living — pending docs stay visible (SRC-006)', () => {
  const docs = [doc('DEC-001', 'decision', 'active'), doc('DEC-002', 'decision', 'proposed'), doc('DEC-003', 'decision', 'superseded')];
  const sec = treeSection(docs, 'decision', false);
  assert.deepEqual(sec.shown.map((d) => d.id), ['DEC-001', 'DEC-002']);
  assert.equal(sec.livingCount, 2);
  assert.equal(sec.deadCount, 1);
});
