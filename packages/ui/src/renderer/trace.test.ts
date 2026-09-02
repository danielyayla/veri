import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { VeriDocument } from '@verikb/core';
import { daysBetween, fmtElapsed, traceChain } from './trace.ts';

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

const RECEIPT_BODY = '## Receipts\n\n- 2026-08-25 — de50b17 — src/a.ts — claude session shipped the slice, verify green\n';

/** A full turn: evidence → REQ → DEC → WO (receipt) → outcome verdict. */
function fullChain(): VeriDocument[] {
  return [
    doc({ id: 'SRC-044', type: 'source', title: 'Support thread', status: 'imported', created: '2026-08-19', kind: 'user-feedback' }),
    doc({
      id: 'REQ-036',
      type: 'requirement',
      title: 'Overdue reminders',
      status: 'accepted',
      created: '2026-08-20',
      approved: '2026-08-21',
      approvedBy: 'Daniel',
      kind: 'hypothesis',
      outcome: { metric: 'open-rate', target: '>= 40%' },
      links: [{ id: 'SRC-044', rel: 'derived-from' }],
    }),
    doc({
      id: 'DEC-149',
      type: 'decision',
      title: 'Ride the digest worker',
      status: 'active',
      created: '2026-08-22',
      approved: '2026-08-22',
      links: [{ id: 'WO-159', rel: 'constrains' }],
    }),
    doc({
      id: 'WO-159',
      type: 'work-order',
      title: 'Reminder send path',
      status: 'done',
      created: '2026-08-22',
      approved: '2026-08-23',
      approvedBy: 'Daniel',
      claimedBy: 'fable-wo159',
      claimedAt: '2026-08-23',
      body: RECEIPT_BODY,
      links: [{ id: 'REQ-036', rel: 'serves' }],
    }),
    doc({
      id: 'SRC-052',
      type: 'source',
      title: 'Open-rate 61%',
      status: 'imported',
      created: '2026-09-01',
      links: [
        { id: 'REQ-036', rel: 'supports' },
        { id: 'WO-159', rel: 'outcome-of' },
      ],
    }),
    // Noise the walk must not pick up: an unrelated document, and a design
    // source in the REQ's wider neighborhood — evidence through a
    // requirement follows derived-from only, never the whole accretion.
    doc({ id: 'REQ-001', type: 'requirement', title: 'Elsewhere', status: 'accepted' }),
    doc({ id: 'SRC-060', type: 'source', title: 'Design canon', status: 'imported', links: [{ id: 'REQ-036', rel: 'designs' }] }),
  ];
}

test('full chain: every hop in causal order, stamps read from frontmatter', () => {
  const trace = traceChain(fullChain(), 'WO-159')!;
  assert.notEqual(trace, null);
  assert.deepEqual(
    trace.rows.map((r) => (r.kind === 'node' ? [r.node.role, r.node.doc.id] : ['absence', r.role])),
    [
      ['evidence', 'SRC-044'],
      ['requirement', 'REQ-036'],
      ['decision', 'DEC-149'],
      ['work-order', 'WO-159'],
      ['outcome', 'SRC-052'],
    ],
  );
  const nodes = trace.rows.flatMap((r) => (r.kind === 'node' ? [r.node] : []));
  // First node carries no connector; human gates wear ◈, the outcome ◇.
  assert.equal(nodes[0].connector, null);
  assert.equal(nodes[1].connector?.glyph, '◈');
  assert.match(nodes[1].connector!.label, /intent gate — approved 2026-08-21 by Daniel/);
  assert.match(nodes[2].connector!.label, /decision gate — approved 2026-08-22/);
  assert.match(nodes[3].connector!.label, /dispatch gate — dispatched 2026-08-23 · claimed by fable-wo159/);
  assert.equal(nodes[4].connector?.glyph, '◇');
  assert.equal(nodes[4].connector?.tone, 'green');
  // Meta lines carry the frontmatter stamps and the receipt facts.
  assert.match(nodes[1].meta, /bet: open-rate >= 40%/);
  assert.match(nodes[3].meta, /⌁ fable-wo159 · dispatched 2026-08-23 · 1 receipt filed/);
  assert.deepEqual(nodes[3].commits, [{ sha: 'de50b17', receipt: true }]);
  assert.equal(nodes[4].statusLabel, 'supports');
  assert.match(nodes[4].meta, /supports REQ-036 · outcome-of WO-159 · filed 2026-09-01/);
  // The stamp ledger: every approved: date plus the receipt commit, date order.
  assert.deepEqual(
    trace.stamps.map((s) => [s.label, s.date, s.by]),
    [
      ['REQ-036 accepted', '2026-08-21', 'Daniel'],
      ['DEC-149 active', '2026-08-22', null],
      ['WO-159 dispatched', '2026-08-23', 'Daniel'],
      ['WO-159 receipt', '2026-08-25', 'de50b17'],
    ],
  );
});

test('missing hops render as honest absences, never an error', () => {
  // A done WO with a REQ but no evidence, no decision, no outcome yet.
  const docs = [
    doc({ id: 'REQ-010', type: 'requirement', title: 'Intent', status: 'accepted', approved: '2026-08-10' }),
    doc({
      id: 'WO-050',
      type: 'work-order',
      title: 'The work',
      status: 'done',
      approved: '2026-08-12',
      body: RECEIPT_BODY,
      links: [{ id: 'REQ-010', rel: 'serves' }],
    }),
  ];
  const trace = traceChain(docs, 'WO-050')!;
  assert.deepEqual(
    trace.rows.map((r) => (r.kind === 'node' ? r.node.doc.id : `absence:${r.role}`)),
    ['absence:evidence', 'REQ-010', 'absence:decision', 'WO-050', 'absence:outcome'],
  );
  const outcomeGap = trace.rows.find((r) => r.kind === 'absence' && r.role === 'outcome');
  assert.match((outcomeGap as { text: string }).text, /no outcome source yet — reality hasn't reported/);
});

test('an unlinked work order renders degenerate: just the WO node', () => {
  const docs = [doc({ id: 'WO-001', type: 'work-order', title: 'Alone', status: 'in-progress' })];
  const trace = traceChain(docs, 'WO-001')!;
  assert.deepEqual(
    trace.rows.map((r) => (r.kind === 'node' ? r.node.doc.id : `absence:${r.role}`)),
    ['WO-001'],
  );
  assert.equal(trace.stamps.length, 0);
  assert.equal(trace.elapsed.length, 0);
});

test('a non-work-order id yields null, not a throw', () => {
  assert.equal(traceChain(fullChain(), 'REQ-036'), null);
  assert.equal(traceChain(fullChain(), 'WO-999'), null);
});

test('elapsed legs match the frontmatter date arithmetic', () => {
  const trace = traceChain(fullChain(), 'WO-159')!;
  assert.deepEqual(trace.elapsed, [
    { label: 'evidence → accepted', days: 2 }, // 08-19 → 08-21
    { label: 'accepted → shipped', days: 4 }, // 08-21 → 08-25 (receipt date)
    { label: 'shipped → verdict', days: 7 }, // 08-25 → 09-01
  ]);
});

test('elapsed skips legs whose dates the record does not hold', () => {
  // No evidence and no outcome: only accepted → shipped survives.
  const docs = [
    doc({ id: 'REQ-010', type: 'requirement', title: 'Intent', status: 'accepted', approved: '2026-08-10' }),
    doc({
      id: 'WO-050',
      type: 'work-order',
      title: 'The work',
      status: 'done',
      body: RECEIPT_BODY,
      links: [{ id: 'REQ-010', rel: 'serves' }],
    }),
  ];
  const trace = traceChain(docs, 'WO-050')!;
  assert.deepEqual(trace.elapsed, [{ label: 'accepted → shipped', days: 15 }]); // 08-10 → 08-25
});

test('daysBetween and fmtElapsed', () => {
  assert.equal(daysBetween('2026-08-19', '2026-08-21'), 2);
  assert.equal(daysBetween('2026-08-25', '2026-09-01'), 7);
  assert.equal(daysBetween('not-a-date', '2026-09-01'), null);
  assert.equal(fmtElapsed(0), 'same day');
  assert.equal(fmtElapsed(4), '4 d');
  assert.equal(fmtElapsed(14), '2 w');
  assert.equal(fmtElapsed(90), '3 mo');
});

test('outcome sources never double as evidence, and REQ-side evidence is derived-from only', () => {
  const trace = traceChain(fullChain(), 'WO-159')!;
  const evidenceIds = trace.rows.flatMap((r) => (r.kind === 'node' && r.node.role === 'evidence' ? [r.node.doc.id] : []));
  // SRC-052 (outcome) and SRC-060 (a `designs` neighbor of the REQ) both out.
  assert.deepEqual(evidenceIds, ['SRC-044']);
});

test("the WO's own direct source links count as evidence", () => {
  const docs = fullChain();
  docs.push(doc({ id: 'SRC-070', type: 'source', title: 'Design for this slice', status: 'imported', created: '2026-08-22', kind: 'design' }));
  const wo = docs.find((d) => d.id === 'WO-159')!;
  wo.links = [...wo.links, { id: 'SRC-070', rel: 'designed-by' }];
  const trace = traceChain(docs, 'WO-159')!;
  const evidenceIds = trace.rows.flatMap((r) => (r.kind === 'node' && r.node.role === 'evidence' ? [r.node.doc.id] : []));
  assert.deepEqual(evidenceIds, ['SRC-044', 'SRC-070']); // created order
});
