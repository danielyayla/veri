import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { GitFacts, VeriDocument } from './index.ts';
import {
  checkProvenance,
  commitsByWorkOrder,
  parseReceipts,
  subjectWorkOrders,
  workOrdersTouching,
} from './provenance.ts';

function workOrder(id: string, status: string, receipts: string[]): VeriDocument {
  return {
    id,
    type: 'work-order',
    title: id,
    status,
    created: '2026-08-18',
    updated: '2026-08-18',
    links: [],
    frontmatter: {},
    body: `## Summary\n\nx\n\n## Receipts\n\n${receipts.map((r) => `- ${r}`).join('\n')}\n`,
    file: `work-orders/${id}.md`,
    inlineRefs: [],
  };
}

const FACTS: GitFacts = {
  commits: [
    {
      sha: 'aaaa111aaaa111aaaa111aaaa111aaaa111aaaa1',
      date: '2026-08-18',
      subject: 'WO-001: build the thing',
      files: ['packages/core/src/thing.ts', 'packages/core/src/thing.test.ts'],
    },
    {
      sha: 'bbbb222bbbb222bbbb222bbbb222bbbb222bbbb2',
      date: '2026-08-17',
      subject: 'unrelated housekeeping',
      files: ['README.md'],
    },
  ],
};

// --- parseReceipts: the pointer form, and the corpus's older shapes ---

test('parseReceipts reads the pointer form: date — sha — one sentence (DEC-142)', () => {
  const [receipt] = parseReceipts('## Receipts\n\n- 2026-09-01 — aaaa111 — did the thing\n');
  assert.deepEqual(receipt.shas, ['aaaa111']);
  assert.equal(receipt.date, '2026-09-01');
  assert.equal(receipt.summary, 'did the thing');
});

test('parseReceipts stays lenient about old forms: the files segment rides along as summary text', () => {
  const [receipt] = parseReceipts(
    '## Receipts\n\n- 2026-08-18 — aaaa111 — packages/core/src/thing.ts, README.md — did the thing\n',
  );
  assert.deepEqual(receipt.shas, ['aaaa111']);
  assert.equal(receipt.date, '2026-08-18');
  assert.equal(receipt.summary, 'packages/core/src/thing.ts, README.md — did the thing');
});

test('parseReceipts reads the date and the summary from the same segmentation (WO-128)', () => {
  const receipts = parseReceipts(
    [
      '## Receipts',
      '',
      // A summary spanning further separators keeps them, normalized.
      '- 2026-08-10 · abc1234 · verified live — .cursor/mcp.json written at runtime',
      // Nothing before the first separator that looks like a date.
      '- session note — abc1234 — tidy up',
      // Nothing past the SHA segment at all.
      '- 2026-08-11 — abc1234',
    ].join('\n'),
  );
  assert.equal(receipts[0].date, '2026-08-10');
  assert.equal(receipts[0].summary, 'verified live — .cursor/mcp.json written at runtime');
  assert.equal(receipts[1].date, null);
  assert.equal(receipts[1].summary, 'tidy up');
  assert.equal(receipts[2].summary, '');
});

test('parseReceipts handles middle dots, "commit" prefixes, and dual SHAs', () => {
  const receipts = parseReceipts(
    [
      '## Receipts',
      '',
      '- 2026-08-10 · abc1234 · session',
      '- 2026-08-13 — commit def5678 — session',
      '- 2026-08-10 — fa0dada + 25baf52 — gate shipped',
    ].join('\n'),
  );
  assert.deepEqual(receipts[0].shas, ['abc1234']);
  assert.deepEqual(receipts[1].shas, ['def5678']);
  assert.deepEqual(receipts[2].shas, ['fa0dada', '25baf52']);
});

test('parseReceipts joins wrapped lines into one item', () => {
  const [receipt] = parseReceipts(
    ['## Receipts', '', '- 2026-08-17 — 6f60207 — session: shipped the site,', '  and wired the release.'].join('\n'),
  );
  assert.deepEqual(receipt.shas, ['6f60207']);
  assert.equal(receipt.summary, 'session: shipped the site, and wired the release.');
});

test('parseReceipts yields nothing verifiable from a pre-convention receipt', () => {
  const [receipt] = parseReceipts('## Receipts\n\n- an early receipt with no sha at all\n');
  assert.deepEqual(receipt.shas, []);
  // It claims no date and no summary either; `raw` still holds the text.
  assert.equal(receipt.date, null);
  assert.equal(receipt.summary, '');
  assert.equal(receipt.raw, 'an early receipt with no sha at all');
});

// --- subjectWorkOrders: the commit convention read back ---

test('subjectWorkOrders honors the convention and its multi-id and variant forms', () => {
  assert.deepEqual(subjectWorkOrders('WO-001: build the thing'), ['WO-001']);
  assert.deepEqual(subjectWorkOrders('WO-044, WO-045: proposals filed'), ['WO-044', 'WO-045']);
  assert.deepEqual(subjectWorkOrders('WO-016 migration: ratify the corpus'), ['WO-016']);
  assert.deepEqual(subjectWorkOrders('v0.1.3: WO-033 acceptance run'), []);
  assert.deepEqual(subjectWorkOrders('Remove in-progress WO-030 work'), []);
  assert.deepEqual(subjectWorkOrders('fix: build before typecheck'), []);
});

// --- checkProvenance: the pointer's one claim (DEC-142) ---

test('a receipt citing a commit absent from history yields receipt-commit-missing', () => {
  const doc = workOrder('WO-001', 'done', ['2026-08-18 — 9999fff — session']);
  const advisories = checkProvenance([doc], FACTS);
  assert.deepEqual(
    advisories.map((a) => a.kind),
    ['receipt-commit-missing'],
  );
  assert.match(advisories[0].message, /9999fff/);
});

test('the reconciliation tier is retired: its old fixtures no longer produce advisories (WO-141)', () => {
  // Each of these previously fired one of the three retired rules.
  const prefixed = workOrder('WO-002', 'done', [
    // receipt-prefix: bbbb222's subject lacks the WO-002: prefix.
    '2026-08-18 — bbbb222 — README.md — session',
  ]);
  const files = workOrder('WO-001', 'done', [
    // receipt-files: aaaa111 never touched packages/mcp/src/server.ts.
    '2026-08-18 — aaaa111 — packages/mcp/src/server.ts — session',
  ]);
  const unverified = workOrder('WO-003', 'done', [
    // receipt-unverified: done with nothing resolvable in any receipt.
    'an early receipt with no sha',
  ]);
  assert.deepEqual(checkProvenance([prefixed, files, unverified], FACTS), []);
});

test('a pointer resolving to a real commit verifies clean, whatever the subject says', () => {
  const doc = workOrder('WO-001', 'done', ['2026-08-18 — aaaa111 — built the thing']);
  const other = workOrder('WO-002', 'done', ['2026-08-17 — bbbb222 — housekeeping ratified']);
  assert.deepEqual(checkProvenance([doc, other], FACTS), []);
});

test('non-work-orders are never checked', () => {
  const doc = { ...workOrder('REQ-001', 'accepted', ['2026-08-18 — 9999fff — y']), type: 'requirement' as const };
  assert.deepEqual(checkProvenance([doc], FACTS), []);
});

// --- the derived implemented-in index ---

test('commitsByWorkOrder groups WO-prefixed commits and ignores the rest', () => {
  const byWorkOrder = commitsByWorkOrder(FACTS);
  assert.deepEqual([...byWorkOrder.keys()], ['WO-001']);
  assert.equal(byWorkOrder.get('WO-001')?.length, 1);
});

test('workOrdersTouching answers for a file, a directory, and a miss', () => {
  assert.deepEqual(
    workOrdersTouching(FACTS, 'packages/core/src/thing.ts').map((hit) => hit.id),
    ['WO-001'],
  );
  assert.deepEqual(
    workOrdersTouching(FACTS, 'packages/core').map((hit) => hit.id),
    ['WO-001'],
  );
  assert.deepEqual(workOrdersTouching(FACTS, 'site'), []);
});
