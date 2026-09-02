import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { VeriDocument } from '@verikb/core';
import {
  GATE_ORDER,
  effectiveSel,
  gateOf,
  gateQueue,
  moveSel,
  paneSections,
  rowActions,
  rowStatusLine,
} from './gatequeue.ts';

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

/** One fixture per pending state, filed out of gate order on purpose. */
function fixtures(): VeriDocument[] {
  return [
    doc({ id: 'WO-020', type: 'work-order', title: 'Backlog work', status: 'backlog' }),
    doc({ id: 'DEC-010', type: 'decision', title: 'Proposed choice', status: 'proposed' }),
    doc({ id: 'WO-021', type: 'work-order', title: 'Receipted work', status: 'in-progress', body: RECEIPT_BODY }),
    doc({ id: 'REQ-001', type: 'requirement', title: 'Draft intent', status: 'draft' }),
    // None of these wait at a gate:
    doc({ id: 'REQ-002', type: 'requirement', title: 'Accepted', status: 'accepted' }),
    doc({ id: 'DEC-011', type: 'decision', title: 'Active', status: 'active' }),
    doc({ id: 'WO-022', type: 'work-order', title: 'In progress, no receipt', status: 'in-progress' }),
    doc({ id: 'WO-023', type: 'work-order', title: 'Done', status: 'done' }),
    doc({ id: 'SRC-001', type: 'source', title: 'Evidence', status: 'imported' }),
  ];
}

test('gateQueue groups all four pending states into their gates, in SRC-076 order', () => {
  const q = gateQueue(fixtures());
  assert.deepEqual(
    q.rows.map((r) => [r.gate, r.doc.id]),
    [
      ['intent', 'REQ-001'],
      ['decision', 'DEC-010'],
      ['dispatch', 'WO-020'],
      ['done', 'WO-021'],
    ],
  );
  assert.deepEqual(q.counts, { intent: 1, decision: 1, dispatch: 1, done: 1 });
  assert.equal(q.total, 4);
});

test('gateOf holds the done gate to receipted in-progress work only', () => {
  assert.equal(gateOf(doc({ id: 'WO-022', type: 'work-order', title: 'mid-flight', status: 'in-progress' })), null);
  assert.equal(
    gateOf(doc({ id: 'WO-021', type: 'work-order', title: 'receipted', status: 'in-progress', body: RECEIPT_BODY })),
    'done',
  );
  assert.equal(gateOf(doc({ id: 'WO-023', type: 'work-order', title: 'done', status: 'done' })), null);
  assert.equal(gateOf(doc({ id: 'SRC-001', type: 'source', title: 'evidence', status: 'imported' })), null);
});

test('within a gate, oldest filing leads; created ties break on id', () => {
  const q = gateQueue([
    doc({ id: 'REQ-011', type: 'requirement', title: 'b', status: 'draft', created: '2026-08-02' }),
    doc({ id: 'REQ-010', type: 'requirement', title: 'a', status: 'draft', created: '2026-08-03' }),
    doc({ id: 'REQ-012', type: 'requirement', title: 'c', status: 'draft', created: '2026-08-02' }),
  ]);
  assert.deepEqual(
    q.rows.map((r) => r.doc.id),
    ['REQ-011', 'REQ-012', 'REQ-010'],
  );
});

test('the empty queue is a well-formed degenerate: zero counts, null selection', () => {
  const q = gateQueue([]);
  assert.deepEqual(q.rows, []);
  assert.equal(q.total, 0);
  for (const gate of GATE_ORDER) assert.equal(q.counts[gate], 0);
  assert.equal(effectiveSel(q, null), null);
  assert.equal(effectiveSel(q, 'REQ-001'), null);
  assert.equal(moveSel(q, null, 1), null);
});

test('approve and send-back act on intent and decision gates only (DEC-143 keeps dispatch out)', () => {
  assert.deepEqual(rowActions('intent'), { approve: true, sendBack: true });
  assert.deepEqual(rowActions('decision'), { approve: true, sendBack: true });
  assert.deepEqual(rowActions('dispatch'), { approve: false, sendBack: false });
  assert.deepEqual(rowActions('done'), { approve: false, sendBack: false });
});

test('j/k walks the flat order and clamps at both ends; a vanished selection resets to the head', () => {
  const q = gateQueue(fixtures());
  assert.equal(effectiveSel(q, null), 'REQ-001');
  assert.equal(moveSel(q, 'REQ-001', 1), 'DEC-010');
  assert.equal(moveSel(q, 'DEC-010', 1), 'WO-020');
  assert.equal(moveSel(q, 'WO-021', 1), 'WO-021');
  assert.equal(moveSel(q, 'REQ-001', -1), 'REQ-001');
  // The approved doc left the queue: selection falls back to the first row.
  assert.equal(effectiveSel(q, 'REQ-999'), 'REQ-001');
});

const DECISION_BODY = [
  '## Choice',
  '',
  'Retry queue lives in Postgres.',
  '',
  '## Concerns flagged during implementation',
  '',
  '- At-least-once delivery strains [[REQ-036]].',
  '- Polling adds vacuum pressure.',
  '',
  '## Rejected alternatives',
  '',
  '- **SQS with a dead-letter queue** — new infrastructure for one queue.',
  '- **In-process retry** — loses queued retries on restart.',
  '',
  '## Revisit when',
  '',
  'Queue depth sustains above 10k.',
].join('\n');

test('paneSections orders flagged concerns above alternatives above revisit, rest after', () => {
  const secs = paneSections(doc({ id: 'DEC-010', type: 'decision', title: 't', status: 'proposed', body: DECISION_BODY }));
  assert.deepEqual(
    secs.map((s) => s.kind),
    ['flagged', 'alternatives', 'revisit', 'section'],
  );
  assert.equal(secs[0].kind === 'flagged' && secs[0].blocks.length, 2);
  assert.deepEqual(secs[1].kind === 'alternatives' && secs[1].items.map((a) => a.name), [
    'SQS with a dead-letter queue',
    'In-process retry',
  ]);
  assert.equal(secs[1].kind === 'alternatives' && secs[1].items[0].reason, 'new infrastructure for one queue.');
  assert.equal(secs[2].kind === 'revisit' && secs[2].text, 'Queue depth sustains above 10k.');
  assert.equal(secs[3].kind === 'section' && secs[3].title, 'Choice');
});

test('a revisit condition folded into prose is lifted; nothing is fabricated when absent', () => {
  const withProse = paneSections(
    doc({
      id: 'DEC-011',
      type: 'decision',
      title: 't',
      status: 'proposed',
      body: '## Rationale\n\nSolid.\n\nRevisit when a second consumer appears.\n',
    }),
  );
  assert.equal(withProse[0].kind === 'revisit' && withProse[0].text, 'Revisit when a second consumer appears.');
  const bare = paneSections(doc({ id: 'REQ-001', type: 'requirement', title: 't', status: 'draft', body: '## Acceptance criteria\n\n- [ ] One\n' }));
  assert.deepEqual(
    bare.map((s) => s.kind),
    ['section'],
  );
});

test('rowStatusLine names the flagged count on decision rows that carry concerns', () => {
  const flaggedDec = doc({ id: 'DEC-010', type: 'decision', title: 't', status: 'proposed', body: DECISION_BODY });
  assert.equal(rowStatusLine('decision', flaggedDec), 'proposed · 2 concerns flagged');
  const plainDec = doc({ id: 'DEC-012', type: 'decision', title: 't', status: 'proposed', body: '## Choice\n\nX.\n' });
  assert.equal(rowStatusLine('decision', plainDec), 'proposed → active on your stamp');
  assert.equal(rowStatusLine('dispatch', doc({ id: 'WO-020', type: 'work-order', title: 't', status: 'backlog' })), 'backlog · dispatch is your gesture');
});
