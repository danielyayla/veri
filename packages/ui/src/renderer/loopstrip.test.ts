import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Advisory, Issue, VeriDocument } from '@verikb/core';
import { MARKER_GATES, loopStrip } from './loopstrip.ts';
import type { LoopState } from './loopstrip.ts';
import { GATE_ORDER } from './gatequeue.ts';

function doc(partial: Partial<VeriDocument> & Pick<VeriDocument, 'id' | 'type' | 'title' | 'status'>): VeriDocument {
  return {
    created: '2026-08-01',
    updated: '2026-08-01',
    links: [],
    frontmatter: {},
    body: '',
    file: `${partial.type}s/${partial.id}.md`,
    inlineRefs: [],
    ...partial,
  };
}

const RECEIPT_BODY = '## Receipts\n\n- 2026-08-30 — abc1234 — src/a.ts — claude session shipped the slice\n';

const state = (partial: Partial<LoopState>): LoopState => ({ documents: [], issues: [], advisories: [], ...partial });

/** Every stage populated, every gate pending — the mockup's busy project. */
function busy(): LoopState {
  return state({
    documents: [
      doc({ id: 'SRC-001', type: 'source', title: 'Evidence', status: 'imported' }),
      doc({ id: 'SRC-002', type: 'source', title: 'More evidence', status: 'imported' }),
      // An outcome source is Maintain's verdict, not Plan's evidence.
      doc({ id: 'SRC-003', type: 'source', title: 'Reality reported', status: 'imported', links: [{ id: 'REQ-002', rel: 'supports' }] }),
      // Withdrawn documents are out of play in every stage count.
      doc({ id: 'SRC-004', type: 'source', title: 'Withdrawn', status: 'withdrawn' }),
      doc({ id: 'REQ-001', type: 'requirement', title: 'Draft intent', status: 'draft' }),
      doc({ id: 'REQ-002', type: 'requirement', title: 'Accepted', status: 'accepted' }),
      doc({ id: 'DEC-001', type: 'decision', title: 'Proposed choice', status: 'proposed' }),
      doc({ id: 'DEC-002', type: 'decision', title: 'Active', status: 'active' }),
      doc({ id: 'WO-001', type: 'work-order', title: 'Backlog work', status: 'backlog' }),
      doc({ id: 'WO-002', type: 'work-order', title: 'Claimed work', status: 'in-progress', claimedBy: 'fable-a' }),
      doc({ id: 'WO-003', type: 'work-order', title: 'Receipted work', status: 'in-progress', claimedBy: 'fable-b', body: RECEIPT_BODY }),
      doc({ id: 'WO-004', type: 'work-order', title: 'Done', status: 'done' }),
    ],
    issues: [{ kind: 'orphan-wo', file: 'work-orders/WO-001.md', id: 'WO-001', message: 'x' } as Issue],
    advisories: [
      { kind: 'drift-stale-wo', file: 'work-orders/WO-002.md', id: 'WO-002', message: 'x' } as Advisory,
      // Non-drift advisories are not Test's drift count.
      { kind: 'untested-bet', file: 'requirements/REQ-002.md', id: 'REQ-002', workOrderIds: [], message: 'x' } as Advisory,
    ],
  });
}

test('loopStrip derives all six stage counts from document statuses', () => {
  const strip = loopStrip(busy());
  assert.deepEqual(
    strip.stages.map((s) => [s.key, s.count]),
    [
      ['plan', '2 sources'],
      ['design', '1 REQ · 1 DEC'],
      ['build', '2 claimed · ⌁ 2'],
      ['test', '1 issue · 1 drift'],
      ['deploy', '1 at done gate'],
      ['maintain', '1 verdict filed'],
    ],
  );
});

test('the stage holding claimed work orders wears the ember treatment, alone', () => {
  const strip = loopStrip(busy());
  assert.deepEqual(strip.stages.map((s) => [s.key, s.ember]).filter(([, e]) => e === true), [['build', true]]);
});

test('a gate marker is amber iff a promotion pends at that crossing', () => {
  // Everything pending: the three human-gated crossings are amber, the two
  // commit-fired crossings stay green.
  assert.deepEqual(
    loopStrip(busy()).markers.map((m) => m.pending),
    [true, true, false, true, false],
  );
  // One pending draft REQ colors only the intent crossing.
  const intentOnly = state({ documents: [doc({ id: 'REQ-001', type: 'requirement', title: 'Draft', status: 'draft' })] });
  assert.deepEqual(
    loopStrip(intentOnly).markers.map((m) => m.pending),
    [true, false, false, false, false],
  );
  // A proposed DEC and a backlog WO each color the shared second crossing.
  for (const pending of [
    doc({ id: 'DEC-001', type: 'decision', title: 'Proposed', status: 'proposed' }),
    doc({ id: 'WO-001', type: 'work-order', title: 'Backlog', status: 'backlog' }),
  ]) {
    assert.deepEqual(
      loopStrip(state({ documents: [pending] })).markers.map((m) => m.pending),
      [false, true, false, false, false],
    );
  }
  // A receipted in-progress WO waits at done; an unreceipted one waits nowhere.
  const receipted = state({
    documents: [doc({ id: 'WO-001', type: 'work-order', title: 'W', status: 'in-progress', claimedBy: 's', body: RECEIPT_BODY })],
  });
  assert.deepEqual(loopStrip(receipted).markers.map((m) => m.pending), [false, false, false, true, false]);
  const unreceipted = state({
    documents: [doc({ id: 'WO-001', type: 'work-order', title: 'W', status: 'in-progress', claimedBy: 's' })],
  });
  assert.deepEqual(loopStrip(unreceipted).markers.map((m) => m.pending), [false, false, false, false, false]);
});

test('the empty project still renders: six zero-state counts, all gates green', () => {
  const strip = loopStrip(state({}));
  assert.deepEqual(
    strip.stages.map((s) => s.count),
    ['0 sources', '0 REQ · 0 DEC', '0 claimed', 'clean · 0 drift', '0 at done gate', '0 verdicts filed'],
  );
  assert.equal(strip.stages.length, 6);
  assert.equal(strip.markers.length, 5);
  assert.ok(strip.markers.every((m) => m.pending === false));
  assert.ok(strip.stages.every((s) => s.ember === false));
});

test('a clean check reads "clean"; issues replace it, never hide it', () => {
  const clean = loopStrip(state({}));
  assert.equal(clean.stages.find((s) => s.key === 'test')?.count, 'clean · 0 drift');
  const broken = loopStrip(busy());
  assert.equal(broken.stages.find((s) => s.key === 'test')?.count, '1 issue · 1 drift');
});

test('MARKER_GATES places each WF-001 gate at exactly one crossing', () => {
  const placed = MARKER_GATES.flat();
  assert.deepEqual([...placed].sort(), [...GATE_ORDER].sort());
  assert.equal(MARKER_GATES.length, 5);
});
