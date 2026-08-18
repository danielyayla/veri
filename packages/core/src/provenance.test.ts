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
      subject: 'WO-001: build the thing',
      files: ['packages/core/src/thing.ts', 'packages/core/src/thing.test.ts'],
    },
    {
      sha: 'bbbb222bbbb222bbbb222bbbb222bbbb222bbbb2',
      subject: 'unrelated housekeeping',
      files: ['README.md'],
    },
  ],
};

// --- parseReceipts: the corpus's real formats ---

test('parseReceipts reads the canonical date — sha — files — summary shape', () => {
  const [receipt] = parseReceipts(
    '## Receipts\n\n- 2026-08-18 — aaaa111 — packages/core/src/thing.ts, README.md — did the thing\n',
  );
  assert.deepEqual(receipt.shas, ['aaaa111']);
  assert.deepEqual(receipt.paths, ['packages/core/src/thing.ts', 'README.md']);
});

test('parseReceipts handles middle dots, "commit" prefixes, and dual SHAs', () => {
  const receipts = parseReceipts(
    [
      '## Receipts',
      '',
      '- 2026-08-10 · abc1234 · packages/ui/src/lib/mcpconfig.ts(+test) · session',
      '- 2026-08-13 — commit def5678 — packages/core/src/{check,types}.ts — session',
      '- 2026-08-10 — fa0dada + 25baf52 — packages/core — gate shipped',
    ].join('\n'),
  );
  assert.deepEqual(receipts[0].shas, ['abc1234']);
  assert.deepEqual(receipts[0].paths, ['packages/ui/src/lib/mcpconfig.ts']);
  assert.deepEqual(receipts[1].shas, ['def5678']);
  assert.deepEqual(receipts[1].paths, ['packages/core/src/check.ts', 'packages/core/src/types.ts']);
  assert.deepEqual(receipts[2].shas, ['fa0dada', '25baf52']);
});

test('parseReceipts reads JSON-array file lists and joins wrapped lines', () => {
  const [receipt] = parseReceipts(
    [
      '## Receipts',
      '',
      '- 2026-08-17 — 6f60207 — ["site/index.html",',
      '  "veri/work-orders/WO-029.md"] — session: shipped the site.',
    ].join('\n'),
  );
  assert.deepEqual(receipt.shas, ['6f60207']);
  assert.deepEqual(receipt.paths, ['site/index.html', 'veri/work-orders/WO-029.md']);
});

test('parseReceipts takes paths from the files segment only, never the summary', () => {
  const [receipt] = parseReceipts(
    '## Receipts\n\n- 2026-08-10 · abc1234 · no code changes · verified live — .cursor/mcp.json written at runtime\n',
  );
  assert.deepEqual(receipt.paths, []);
});

test('parseReceipts yields nothing verifiable from a pre-convention receipt', () => {
  const [receipt] = parseReceipts('## Receipts\n\n- an early receipt with no sha at all\n');
  assert.deepEqual(receipt.shas, []);
  assert.deepEqual(receipt.paths, []);
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

// --- checkProvenance: each advisory, and the clean path ---

test('a receipt citing a commit absent from history yields receipt-commit-missing', () => {
  const doc = workOrder('WO-001', 'done', ['2026-08-18 — 9999fff — packages/core — session']);
  const advisories = checkProvenance([doc], FACTS);
  assert.deepEqual(
    advisories.map((a) => a.kind),
    ['receipt-commit-missing', 'receipt-unverified'],
  );
  assert.match(advisories[0].message, /9999fff/);
});

test('a resolved commit without the WO prefix yields receipt-prefix', () => {
  const doc = workOrder('WO-002', 'done', ['2026-08-18 — bbbb222 — README.md — session']);
  const advisories = checkProvenance([doc], FACTS);
  assert.deepEqual(
    advisories.map((a) => a.kind),
    ['receipt-prefix'],
  );
  assert.match(advisories[0].message, /lacks the WO-002: prefix/);
});

test('a receipt whose files the commit never touched yields receipt-files', () => {
  const doc = workOrder('WO-001', 'done', [
    '2026-08-18 — aaaa111 — packages/mcp/src/server.ts — session',
  ]);
  const advisories = checkProvenance([doc], FACTS);
  assert.deepEqual(
    advisories.map((a) => a.kind),
    ['receipt-files'],
  );
});

test('a done work order with no verifiable receipt yields receipt-unverified', () => {
  const doc = workOrder('WO-003', 'done', ['an early receipt with no sha']);
  const advisories = checkProvenance([doc], FACTS);
  assert.deepEqual(
    advisories.map((a) => a.kind),
    ['receipt-unverified'],
  );
});

test('an in-progress work order with unverifiable receipts stays quiet', () => {
  const doc = workOrder('WO-003', 'in-progress', ['an early receipt with no sha']);
  assert.deepEqual(checkProvenance([doc], FACTS), []);
});

test('a receipt matching its commit — prefix, files, directory tokens — verifies clean', () => {
  const doc = workOrder('WO-001', 'done', [
    '2026-08-18 — aaaa111 — packages/core (thing.ts, +tests) — built the thing',
  ]);
  assert.deepEqual(checkProvenance([doc], FACTS), []);
});

test('non-work-orders are never checked', () => {
  const doc = { ...workOrder('REQ-001', 'accepted', ['2026-08-18 — 9999fff — x — y']), type: 'requirement' as const };
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
