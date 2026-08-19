import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ID_RE, compareIds, extractInlineRefs, typeOfId } from './ids.ts';
import { loadProject } from './load.ts';
import { buildGraph } from './graph.ts';

// WO-050: ids are PREFIX- plus three or more digits — no ceiling.

test('ID_RE accepts three digits and beyond, rejects fewer', () => {
  for (const id of ['REQ-001', 'WO-999', 'WO-1000', 'SRC-12345', 'WF-001']) {
    assert.match(id, ID_RE, id);
  }
  for (const id of ['WO-99', 'WO-1', 'wo-100', 'WO-1000x', 'XX-100', 'WO-']) {
    assert.doesNotMatch(id, ID_RE, id);
  }
});

test('typeOfId is width-agnostic', () => {
  assert.equal(typeOfId('WO-1000'), 'work-order');
  assert.equal(typeOfId('REQ-1004'), 'requirement');
});

test('extractInlineRefs finds 4-digit refs alongside 3-digit ones', () => {
  assert.deepEqual(extractInlineRefs('See [[REQ-001]], [[WO-1000]] and [[WO-1000]] again, not [[WO-99]].'), [
    'REQ-001',
    'WO-1000',
  ]);
});

test('compareIds orders numerically: WO-999 before WO-1000', () => {
  const ids = ['WO-1000', 'WO-100', 'WO-999', 'WO-1001', 'WO-099'];
  assert.deepEqual(ids.sort(compareIds), ['WO-099', 'WO-100', 'WO-999', 'WO-1000', 'WO-1001']);
});

test('compareIds equals plain lexicographic order at uniform 3-digit width', () => {
  // Byte-identical package assembly for existing projects (WO-050): every
  // all-3-digit corpus must sort exactly as it did under plain localeCompare.
  const ids = ['WO-003', 'REQ-014', 'DEC-005', 'SRC-030', 'WF-001', 'REQ-001', 'WO-050', 'DEC-037', 'SRC-016'];
  const numeric = [...ids].sort(compareIds);
  const lexicographic = [...ids].sort((a, b) => a.localeCompare(b));
  assert.deepEqual(numeric, lexicographic);
});

test('a 4-digit document parses and links both directions, frontmatter and inline', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'veri-ids-test-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  for (const sub of ['requirements', 'decisions', 'work-orders', 'sources']) {
    mkdirSync(join(dir, sub), { recursive: true });
  }
  writeFileSync(
    join(dir, 'requirements', 'REQ-001-base.md'),
    ['---', 'id: REQ-001', 'type: requirement', 'title: Base', 'status: accepted', 'created: 2026-08-19', 'updated: 2026-08-19', '---', '', 'Delivered by [[WO-1000]].', ''].join('\n'),
  );
  writeFileSync(
    join(dir, 'work-orders', 'WO-1000-four-digits.md'),
    ['---', 'id: WO-1000', 'type: work-order', 'title: Four digits', 'status: backlog', 'created: 2026-08-19', 'updated: 2026-08-19', 'links:', '  - id: REQ-001', '    rel: implements', '---', '', 'Implements [[REQ-001]].', ''].join('\n'),
  );
  const load = await loadProject(dir);
  assert.deepEqual(load.documents.map((d) => d.id).sort(compareIds), ['REQ-001', 'WO-1000']);
  const wo = load.documents.find((d) => d.id === 'WO-1000')!;
  assert.deepEqual(wo.links, [{ id: 'REQ-001', rel: 'implements' }]);
  assert.deepEqual(wo.inlineRefs, ['REQ-001']);
  const graph = buildGraph(load.documents);
  assert.ok(graph.outgoing('WO-1000').some((e) => e.to === 'REQ-001' && e.rel === 'implements'));
  assert.ok(graph.backlinks('WO-1000').some((e) => e.from === 'REQ-001'));
  assert.ok(graph.backlinks('REQ-001').some((e) => e.from === 'WO-1000'));
});
