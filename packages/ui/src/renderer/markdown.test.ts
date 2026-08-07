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
