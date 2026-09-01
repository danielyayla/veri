import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseReceipts } from '@verikb/core';
import { getReceipts, renderReceipts } from './receipts.ts';

const IMPLEMENTS = ['links:', '  - id: REQ-001', '    rel: implements'];

function workOrder(id: string, title: string, status: string, receipts: string[], extra: string[] = []): string {
  return [
    '---',
    `id: ${id}`,
    'type: work-order',
    `title: ${title}`,
    `status: ${status}`,
    'approved: 2026-08-01',
    'created: 2026-08-01',
    'updated: 2026-08-26',
    ...extra,
    ...IMPLEMENTS,
    '---',
    '',
    '## Summary',
    '',
    'Work.',
    '',
    '## Receipts',
    '',
    ...(receipts.length === 0 ? ['(none yet)'] : receipts.map((entry) => `- ${entry}`)),
    '',
  ].join('\n');
}

/**
 * A corpus spanning what receipts look like in practice: a work order with
 * three of them (an old-form entry with a files segment, middle-dot with
 * two SHAs, and a pre-convention item with nothing verifiable in it), a
 * shipped one with a single pointer-form receipt (DEC-142), a ready one
 * with none, a withdrawn one that did file one, and a requirement — which
 * can never carry receipts.
 */
function sandbox(t: { after(fn: () => void): void }): string {
  const root = mkdtempSync(join(tmpdir(), 'veri-mcp-receipts-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const sub of ['requirements', 'work-orders', 'sources']) mkdirSync(join(root, 'veri', sub), { recursive: true });
  const write = (sub: string, name: string, text: string): void => writeFileSync(join(root, 'veri', sub, name), text);

  write(
    'requirements',
    'REQ-001-live.md',
    ['---', 'id: REQ-001', 'type: requirement', 'title: Live canon', 'status: accepted', 'approved: 2026-08-01', 'created: 2026-08-01', 'updated: 2026-08-01', '---', '', '## Acceptance criteria', '', '- [ ] x', ''].join('\n'),
  );
  write(
    'sources',
    'SRC-001-outcome.md',
    ['---', 'id: SRC-001', 'type: source', 'title: What reality said', 'status: imported', 'kind: outcome', 'created: 2026-08-25', 'updated: 2026-08-25', 'links:', '  - id: REQ-001', '    rel: supports', '  - id: WO-003', '    rel: outcome-of', '---', '', 'The flag moved the number.', ''].join('\n'),
  );
  write(
    'work-orders',
    'WO-002-shipped.md',
    workOrder('WO-002', 'Three sessions', 'done', [
      '2026-08-20 — aaaa111 — packages/core/src/thing.ts, README.md — did the thing',
      '2026-08-21 · bbbb222 + cccc333 · packages/core/src/other.ts · did the other thing — and noted it',
      'an early receipt with no sha at all',
    ]),
  );
  write('work-orders', 'WO-003-single.md', workOrder('WO-003', 'One session', 'done', ['2026-08-22 — dddd444 — shipped the flag']));
  write('work-orders', 'WO-010-pending.md', workOrder('WO-010', 'Nothing yet', 'backlog', []));
  write('work-orders', 'WO-011-gone.md', workOrder('WO-011', 'Retracted', 'withdrawn', ['2026-08-19 — eeee555 — never mind']));
  return root;
}

test('get_receipts for one work order returns every receipt it filed, in filed order', async (t) => {
  const rows = await getReceipts(sandbox(t), 'WO-002');
  assert.equal(rows.length, 3);
  // An old-form receipt stays as filed: its files segment rides along as
  // summary text, uninterpreted (DEC-142 — the list left the format).
  assert.deepEqual(rows[0], {
    workOrder: 'WO-002',
    file: 'veri/work-orders/WO-002-shipped.md',
    date: '2026-08-20',
    shas: ['aaaa111'],
    summary: 'packages/core/src/thing.ts, README.md — did the thing',
    raw: '2026-08-20 — aaaa111 — packages/core/src/thing.ts, README.md — did the thing',
    outcomeSources: [],
  });
  // Dual SHAs, middle-dot separators, and a summary spanning segments.
  assert.deepEqual(rows[1].shas, ['bbbb222', 'cccc333']);
  assert.equal(rows[1].date, '2026-08-21');
  assert.equal(rows[1].summary, 'packages/core/src/other.ts — did the other thing — and noted it');
  // A pre-convention receipt claims nothing rather than claiming wrongly.
  assert.deepEqual([rows[2].date, rows[2].shas, rows[2].summary], [null, [], '']);
  assert.equal(rows[2].raw, 'an early receipt with no sha at all');
});

test('get_receipts with no id spans the corpus, work orders in id order and those with none absent', async (t) => {
  const rows = await getReceipts(sandbox(t));
  assert.deepEqual(
    rows.map((entry) => [entry.workOrder, entry.shas.join('+')]),
    [
      ['WO-002', 'aaaa111'],
      ['WO-002', 'bbbb222+cccc333'],
      ['WO-002', ''],
      ['WO-003', 'dddd444'],
    ],
  );
  // WO-010 filed none, so it contributes no rows; WO-011 is withdrawn and
  // out of play (DEC-110) in the corpus-wide sweep.
  const named = new Set(rows.map((entry) => entry.workOrder));
  assert.ok(!named.has('WO-010') && !named.has('WO-011'));
});

test('a withdrawn work order still answers when asked for by id', async (t) => {
  const rows = await getReceipts(sandbox(t), 'WO-011');
  assert.deepEqual(rows.map((entry) => entry.shas), [['eeee555']]);
});

test('an unknown id, a non-work-order id, and a work order with no receipts each answer empty, not error', async (t) => {
  const root = sandbox(t);
  assert.deepEqual(await getReceipts(root, 'WO-999'), []);
  assert.deepEqual(await getReceipts(root, 'REQ-001'), []);
  assert.deepEqual(await getReceipts(root, 'not-an-id'), []);
  assert.deepEqual(await getReceipts(root, 'WO-010'), []);
});

test('get_receipts refuses a project with no veri/ directory', async (t) => {
  const root = mkdtempSync(join(tmpdir(), 'veri-mcp-receipts-empty-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  await assert.rejects(getReceipts(root), /no veri\/ directory/);
});

test('the rendered receipts put the work order first and the summary last, and name outcome evidence where it exists (WO-154)', async (t) => {
  const text = renderReceipts(await getReceipts(sandbox(t), 'WO-003'), 'WO-003');
  assert.equal(
    text,
    [
      '1 receipt across 1 work order (SHAs as filed — this surface runs no git):',
      'WO-003  2026-08-22  dddd444  shipped the flag',
      'WO-003  outcome evidence: SRC-001 — what shipped here reported back',
    ].join('\n'),
  );
});

test('outcome evidence rides the rows and closes each reported-on work order in the corpus sweep (REQ-033, WO-154)', async (t) => {
  const rows = await getReceipts(sandbox(t));
  // The rows carry the sources as data; work orders nothing reported on
  // carry the empty set, not a gap.
  assert.deepEqual(rows.map((entry) => [entry.workOrder, entry.outcomeSources]), [
    ['WO-002', []],
    ['WO-002', []],
    ['WO-002', []],
    ['WO-003', ['SRC-001']],
  ]);
  const lines = renderReceipts(rows).split('\n');
  assert.equal(lines.at(-1), 'WO-003  outcome evidence: SRC-001 — what shipped here reported back');
  // One naming per work order — never one per receipt.
  assert.equal(lines.filter((line) => line.includes('outcome evidence:')).length, 1);
});

test('the corpus-wide rendering counts both receipts and work orders, and names absent fields', async (t) => {
  const lines = renderReceipts(await getReceipts(sandbox(t))).split('\n');
  assert.equal(lines[0], '4 receipts across 2 work orders (SHAs as filed — this surface runs no git):');
  assert.equal(lines[2], 'WO-002  2026-08-21  bbbb222, cccc333  packages/core/src/other.ts — did the other thing — and noted it');
  // Nothing parsed: the gaps are named, and the raw item stands in for the
  // summary rather than the line trailing off into nothing.
  assert.equal(lines[3], 'WO-002  (no date)  (no sha)  an early receipt with no sha at all');
});

test('an empty result renders as a statement, distinguishing "filed none" from "no such corpus"', async (t) => {
  const root = sandbox(t);
  assert.match(renderReceipts(await getReceipts(root, 'WO-010'), 'WO-010'), /^no receipts for WO-010 —/);
  assert.match(renderReceipts([]), /^no receipts — no work order/);
});

// The whole point of the tool is that there is one receipt parser (DEC-132):
// core's, the same one the receipt-verification advisories read. If this
// surface ever grew its own, this test is what notices.
test('every field comes from core’s parseReceipts, unchanged', async (t) => {
  const body = [
    '## Receipts',
    '',
    '- 2026-08-17 — 6f60207 — session: shipped the site,',
    '  and wired the release.',
  ].join('\n');
  const [parsed] = parseReceipts(body);

  const root = sandbox(t);
  writeFileSync(join(root, 'veri', 'work-orders', 'WO-020-wrapped.md'), workOrder('WO-020', 'Wrapped', 'done', []).replace('(none yet)', body.split('\n').slice(2).join('\n')));
  const [row] = await getReceipts(root, 'WO-020');
  assert.deepEqual([row.date, row.shas, row.summary, row.raw], [parsed.date, parsed.shas, parsed.summary, parsed.raw]);
  assert.equal(row.summary, 'session: shipped the site, and wired the release.');
});

// DEC-081: the agent door spawns no subprocess, so nothing here may reach
// git — the SHAs are what the record says, not what a repository confirms.
test('receipts are read without git: no subprocess import, and unresolvable SHAs survive (DEC-081)', async (t) => {
  const source = await readFile(new URL('./receipts.ts', import.meta.url), 'utf8');
  assert.ok(!/child_process/.test(source), 'the agent door must import no subprocess API');
  assert.ok(!/\bexecFile\b|\bspawn\b|GIT_LOG_FORMAT|checkProvenance/.test(source), 'the agent door must not reach the git-backed verification tier');

  // The sandbox is a bare directory, not a repository, and every SHA in it
  // is invented. Both come back as filed, so nothing was verified away.
  const rows = await getReceipts(sandbox(t));
  assert.equal(rows.length, 4);
  assert.deepEqual(
    rows.flatMap((entry) => entry.shas),
    ['aaaa111', 'bbbb222', 'cccc333', 'dddd444'],
  );
  assert.match(renderReceipts(rows), /SHAs as filed — this surface runs no git/);
});
