import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseBlocks, parseInline, plainText, sections } from './markdown.ts';
import type { Seg } from './markdown.ts';

test('parseInline splits refs, code, and bold', () => {
  const segs = parseInline('See [[REQ-001]] and `veri check` for **rules**.');
  assert.deepEqual(segs, [
    { kind: 'text', text: 'See ' },
    { kind: 'ref', id: 'REQ-001' },
    { kind: 'text', text: ' and ' },
    { kind: 'code', text: 'veri check' },
    { kind: 'text', text: ' for ' },
    { kind: 'bold', text: 'rules' },
    { kind: 'text', text: '.' },
  ]);
});

test('parseBlocks handles headings, wrapped checkboxes, lists, and paragraphs', () => {
  const md = [
    'Intro paragraph',
    'continues here.',
    '',
    '## Acceptance criteria',
    '',
    '- [ ] First criterion that wraps',
    '      onto a second line',
    '- [x] Done criterion',
    '- Plain item',
  ].join('\n');
  const blocks = parseBlocks(md);
  assert.equal(blocks.length, 5);
  assert.equal(blocks[0].kind, 'para');
  assert.equal(plainText((blocks[0] as { segs: Seg[] }).segs), 'Intro paragraph continues here.');
  assert.deepEqual(blocks[1], { kind: 'heading', text: 'Acceptance criteria' });
  assert.equal(blocks[2].kind, 'check');
  assert.equal((blocks[2] as { done: boolean }).done, false);
  assert.equal(plainText((blocks[2] as { segs: Seg[] }).segs), 'First criterion that wraps onto a second line');
  assert.equal((blocks[3] as { done: boolean }).done, true);
  assert.equal(blocks[4].kind, 'li');
});

test('sections splits by ## heading and keeps preamble under ""', () => {
  const secs = sections('Lead-in.\n\n## Choice\n\nPicked A.\n\n## Rationale\n\nBecause.');
  assert.deepEqual([...secs.keys()], ['', 'Choice', 'Rationale']);
  assert.equal(secs.get('Choice')!.length, 1);
});

test('parseInline handles WF refs and italic', () => {
  const segs = parseInline('Per [[WF-001]], stay *inside* scope — **bold** survives.');
  assert.deepEqual(segs[1], { kind: 'ref', id: 'WF-001' });
  assert.deepEqual(segs[3], { kind: 'italic', text: 'inside' });
  assert.deepEqual(segs[5], { kind: 'bold', text: 'bold' });
  assert.equal(plainText(segs), 'Per [[WF-001]], stay inside scope — bold survives.');
});

test('parseBlocks keeps the author numbering on ordered lists and joins wrapped items', () => {
  const blocks = parseBlocks('1. First rule\n2. Second rule that wraps\n   onto a second line\n7. Author skipped ahead');
  assert.deepEqual(
    blocks.map((b) => (b.kind === 'oli' ? b.num : b.kind)),
    ['1', '2', '7'],
  );
  assert.equal(plainText((blocks[1] as { segs: Seg[] }).segs), 'Second rule that wraps onto a second line');
});

test('parseBlocks renders fences verbatim and keeps interiors opaque to sections', () => {
  const md = '## Setup\n\n```yaml\nid: WO-001\n## not a heading\n```\n\nAfter.';
  const blocks = parseBlocks(md);
  assert.deepEqual(blocks[1], { kind: 'fence', lang: 'yaml', text: 'id: WO-001\n## not a heading' });
  const secs = sections(md);
  assert.deepEqual([...secs.keys()], ['', 'Setup']);
  assert.equal(secs.get('Setup')!.length, 2);
});

test('an unclosed fence still lands as a fence block', () => {
  const blocks = parseBlocks('```\nveri check');
  assert.deepEqual(blocks, [{ kind: 'fence', lang: '', text: 'veri check' }]);
});

test('parseBlocks turns pipe rows into a table, dropping the separator row', () => {
  const blocks = parseBlocks('| Surface | Score |\n| --- | ---: |\n| Reader | 4 |\n| Board | 5 |');
  assert.equal(blocks.length, 1);
  const table = blocks[0] as { kind: 'table'; header: Seg[][]; rows: Seg[][][] };
  assert.equal(table.kind, 'table');
  assert.deepEqual(table.header.map(plainText), ['Surface', 'Score']);
  assert.deepEqual(table.rows.map((r) => r.map(plainText)), [['Reader', '4'], ['Board', '5']]);
});

test('parseBlocks joins consecutive quote lines into one blockquote', () => {
  const blocks = parseBlocks('> Drafted 2026-08-18 by an agent session\n> for [[REQ-009]].\n\nBody.');
  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].kind, 'quote');
  assert.equal(plainText((blocks[0] as { segs: Seg[] }).segs), 'Drafted 2026-08-18 by an agent session for [[REQ-009]].');
  assert.equal(blocks[1].kind, 'para');
});

test('a standalone image line becomes an img block with its alt and path', () => {
  const blocks = parseBlocks('![Reader column](./reader.png)');
  assert.deepEqual(blocks, [{ kind: 'img', alt: 'Reader column', src: './reader.png' }]);
});
