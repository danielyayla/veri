import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseDocument } from './parse.ts';
import { replaceLinksBlock, serializeLinks, setDocumentLinks } from './links.ts';

// A file with everything WO-056 promises to leave alone: unknown frontmatter
// keys, a comment-ish quirk, odd spacing on a known key, and a multi-line
// body that even contains its own "links:" line.
const QUIRKY = `---
id: WO-001
type: work-order
title: "Build it — carefully"
status: backlog
created: 2026-08-01
updated: 2026-08-01
owner: daniel   # unknown key, comment-ish tail
x-custom:
  nested: kept
links:
  - id: REQ-001
    rel: implements
  - id: DEC-001
    rel: constrained-by
  - id: SRC-001
    rel: derived-from
priority:    high
---

## Summary

A body line.

\`\`\`
links:
  - id: FAKE-999
    rel: not-frontmatter
\`\`\`

- 2026-08-05 — abc1234 — src/a.ts — a receipt line
`;

/** The fixture with only its links block and updated: line swapped. */
function expected(raw: string, linksBlock: string, date: string): string {
  return raw
    .replace(/^links:\n(?:[ \t]+[^\n]*\n)*/m, `${linksBlock}\n`)
    .replace(/^updated: .*$/m, `updated: ${date}`);
}

test('adding a link changes only the links block and updated:', () => {
  const next = replaceLinksBlock(
    QUIRKY,
    [
      { id: 'REQ-001', rel: 'implements' },
      { id: 'DEC-001', rel: 'constrained-by' },
      { id: 'SRC-001', rel: 'derived-from' },
      { id: 'SRC-002', rel: 'designed-by' },
    ],
    '2026-08-19',
  );
  const block = [
    'links:',
    '  - id: REQ-001',
    '    rel: implements',
    '  - id: DEC-001',
    '    rel: constrained-by',
    '  - id: SRC-001',
    '    rel: derived-from',
    '  - id: SRC-002',
    '    rel: designed-by',
  ].join('\n');
  assert.equal(next, expected(QUIRKY, block, '2026-08-19'));
  // Unknown keys, quirks, and the body's own "links:" fence all survive.
  assert.ok(next.includes('owner: daniel   # unknown key, comment-ish tail'));
  assert.ok(next.includes('x-custom:\n  nested: kept'));
  assert.ok(next.includes('priority:    high'));
  assert.ok(next.includes('  - id: FAKE-999\n    rel: not-frontmatter'));
});

test('removal drops exactly that entry; the others stay byte-for-byte in order', () => {
  const next = replaceLinksBlock(
    QUIRKY,
    [
      { id: 'REQ-001', rel: 'implements' },
      { id: 'SRC-001', rel: 'derived-from' },
    ],
    '2026-08-19',
  );
  const block = ['links:', '  - id: REQ-001', '    rel: implements', '  - id: SRC-001', '    rel: derived-from'].join('\n');
  assert.equal(next, expected(QUIRKY, block, '2026-08-19'));
  // The surviving entries are the fixture's own bytes, same order.
  assert.ok(QUIRKY.includes('  - id: REQ-001\n    rel: implements'));
  assert.ok(next.includes('  - id: REQ-001\n    rel: implements\n  - id: SRC-001\n    rel: derived-from'));
});

test('the result round-trips the parser with exactly the links written', () => {
  const links = [
    { id: 'DEC-001', rel: 'constrained-by' },
    { id: 'REQ-001', rel: 'a rel with spaces' },
  ];
  const next = replaceLinksBlock(QUIRKY, links, '2026-08-19');
  const { document, issues } = parseDocument('work-orders/WO-001.md', next);
  assert.equal(issues.length, 0);
  assert.deepEqual(document?.links, links);
  assert.equal(document?.updated, '2026-08-19');
  // Unknown keys survive into the parsed frontmatter (REQ-001 passthrough).
  assert.equal((document?.frontmatter as Record<string, unknown>)['owner'], 'daniel');
});

test('emptying the links writes links: [] and nothing else changes', () => {
  const next = replaceLinksBlock(QUIRKY, [], '2026-08-19');
  assert.equal(next, expected(QUIRKY, 'links: []', '2026-08-19'));
});

test('a file without a links key gains one at the end of the frontmatter', () => {
  const bare = QUIRKY.replace(/^links:\n(?:[ \t]+[^\n]*\n)*/m, '');
  const next = replaceLinksBlock(bare, [{ id: 'REQ-001', rel: 'implements' }], '2026-08-19');
  assert.ok(next.includes('priority:    high\nlinks:\n  - id: REQ-001\n    rel: implements\n---'));
  const { document, issues } = parseDocument('work-orders/WO-001.md', next);
  assert.equal(issues.length, 0);
  assert.deepEqual(document?.links, [{ id: 'REQ-001', rel: 'implements' }]);
  // No key and no links to write: only the updated: bump.
  const noop = replaceLinksBlock(bare, [], '2026-08-19');
  assert.equal(noop, bare.replace(/^updated: .*$/m, 'updated: 2026-08-19'));
});

test('id:/approved:/status: are untouched by construction — and asserted', () => {
  const approved = QUIRKY.replace('status: backlog', 'status: backlog\napproved: 2026-08-10');
  const next = replaceLinksBlock(approved, [{ id: 'REQ-001', rel: 'implements' }], '2026-08-19');
  assert.match(next, /^id: WO-001$/m);
  assert.match(next, /^status: backlog$/m);
  assert.match(next, /^approved: 2026-08-10$/m);
});

test('malformed input is refused: bad ids, empty rels, missing frontmatter', () => {
  assert.throws(() => replaceLinksBlock(QUIRKY, [{ id: 'NOPE-1x', rel: 'r' }], '2026-08-19'), /not a valid document id/);
  assert.throws(() => replaceLinksBlock(QUIRKY, [{ id: 'REQ-001', rel: '  ' }], '2026-08-19'), /rel must not be empty/);
  assert.throws(() => replaceLinksBlock('no frontmatter here', [], '2026-08-19'), /missing frontmatter/);
});

test('rels outside the bare-scalar shape are quoted and round-trip', () => {
  assert.equal(serializeLinks([{ id: 'REQ-001', rel: 'needs: care' }]), 'links:\n  - id: REQ-001\n    rel: "needs: care"');
  const next = replaceLinksBlock(QUIRKY, [{ id: 'REQ-001', rel: 'needs: care' }], '2026-08-19');
  const { document, issues } = parseDocument('work-orders/WO-001.md', next);
  assert.equal(issues.length, 0);
  assert.deepEqual(document?.links, [{ id: 'REQ-001', rel: 'needs: care' }]);
});

// ---- setDocumentLinks ----

function sandbox(t: { after(fn: () => void): void }): string {
  const dir = mkdtempSync(join(tmpdir(), 'veri-links-test-'));
  mkdirSync(join(dir, 'work-orders'), { recursive: true });
  writeFileSync(join(dir, 'work-orders/WO-001-build-it.md'), QUIRKY);
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

test('setDocumentLinks writes the rewrite and returns it', async (t) => {
  const dir = sandbox(t);
  const result = await setDocumentLinks(dir, 'work-orders/WO-001-build-it.md', [{ id: 'REQ-001', rel: 'implements' }], '2026-08-19');
  assert.equal(readFileSync(join(dir, result.file), 'utf8'), result.text);
  assert.equal(result.text, replaceLinksBlock(QUIRKY, [{ id: 'REQ-001', rel: 'implements' }], '2026-08-19'));
});

test('paths outside veri/ are refused; a missing file is an error, not a restore', async (t) => {
  const dir = sandbox(t);
  for (const bad of ['../escape.md', '/tmp/abs.md', 'work-orders/../../out.md', 'work-orders/not-markdown.txt']) {
    await assert.rejects(setDocumentLinks(dir, bad, []), /refusing to write/);
  }
  await assert.rejects(setDocumentLinks(dir, 'work-orders/WO-999-gone.md', []));
});
