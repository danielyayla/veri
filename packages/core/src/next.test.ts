import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { VeriDocument } from './types.ts';
import { nextDispatchable } from './next.ts';

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
    file: `work-orders/${id}.md`,
    inlineRefs: [],
  };
}

test('nextDispatchable returns the lowest-id ready work order', () => {
  const head = nextDispatchable([
    doc('WO-010', 'work-order', 'ready'),
    doc('WO-002', 'work-order', 'ready'),
    doc('WO-003', 'work-order', 'in-progress'),
    doc('WO-001', 'work-order', 'backlog'),
  ]);
  assert.equal(head?.id, 'WO-002');
});

test('nextDispatchable orders numerically, not lexically', () => {
  const head = nextDispatchable([doc('WO-110', 'work-order', 'ready'), doc('WO-20', 'work-order', 'ready')]);
  assert.equal(head?.id, 'WO-20');
});

test('nextDispatchable ignores non-work-orders and returns undefined when nothing is ready', () => {
  assert.equal(nextDispatchable([]), undefined);
  assert.equal(
    nextDispatchable([doc('REQ-001', 'requirement', 'draft'), doc('WO-001', 'work-order', 'done')]),
    undefined,
  );
});
