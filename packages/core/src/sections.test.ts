import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appendToSection, sectionSpan, sectionText, withoutSection } from './sections.ts';

const DOC = [
  '---',
  'id: WO-001',
  'type: work-order',
  'title: Build it',
  '---',
  '',
  '## Summary',
  '',
  'Do the thing.',
  '',
  '## Receipts',
  '',
  '(none yet)',
  '',
].join('\n');

test('a missing heading creates the section at the end of the document', () => {
  const out = appendToSection(DOC, 'Notes', '- 2026-08-25 — first');
  assert.ok(out.endsWith('\n\n## Notes\n\n- 2026-08-25 — first\n'));
  assert.match(out, /\(none yet\)/); // other sections untouched
});

test('appending preserves existing entries and the following section', () => {
  const doc = `${DOC}\n## Notes\n\n- 2026-08-24 — earlier\n`;
  const once = appendToSection(doc, 'Summary', 'More prose.');
  assert.match(once, /## Summary\n\nDo the thing\.\nMore prose\.\n\n## Receipts/);
  const twice = appendToSection(appendToSection(doc, 'Notes', '- a'), 'Notes', '- b');
  assert.match(twice, /## Notes\n\n- 2026-08-24 — earlier\n- a\n- b\n$/);
});

test('the placeholder is stripped before the first entry', () => {
  const out = appendToSection(DOC, 'Receipts', '- 2026-08-25 — abc1234 — x.ts — did it', {
    placeholder: '(none yet)',
  });
  assert.ok(!out.includes('(none yet)'));
  assert.match(out, /## Receipts\n\n- 2026-08-25 — abc1234 — x\.ts — did it\n$/);
});

test('multi-word headings match exactly; deeper headings and prose do not', () => {
  const doc = ['## Review notes zone', '', 'prose saying ## Review notes', '', '### Review notes', '', 'sub'].join('\n');
  const out = appendToSection(doc, 'Review notes', '- entry');
  // None of the lookalikes matched — the section was created fresh at the end.
  assert.ok(out.endsWith('\n\n## Review notes\n\n- entry\n'));
});

// --- Reading a section (WO-112): the same boundary rule as the splice ---

test('sectionText returns a section body, and null when the heading is absent', () => {
  // Only the heading's own newline is consumed — the blank line beneath a
  // conventionally written heading survives.
  assert.equal(sectionText(DOC, 'Summary'), '\nDo the thing.\n\n');
  assert.equal(sectionText(DOC, 'Receipts'), '\n(none yet)\n');
  assert.equal(sectionText(DOC, 'In scope'), null);
});

test('the heading match is exact — deeper headings and prose mentions never match', () => {
  assert.equal(sectionSpan('### Receipts\n\nx\n', 'Receipts'), null);
  assert.equal(sectionSpan('See the ## Receipts section.\n', 'Receipts'), null);
  assert.equal(sectionSpan('##  Receipts  \n\nx\n', 'Receipts')?.start, 0);
});

test('withoutSection cuts heading and body, leaving everything else untouched', () => {
  const cut = withoutSection(DOC, 'Receipts');
  assert.ok(!cut.includes('Receipts'));
  assert.ok(!cut.includes('(none yet)'));
  assert.ok(cut.includes('Do the thing.'));
  // A section between two others closes at the next heading, not the end.
  const three = '## A\n\na\n\n## B\n\nb\n\n## C\n\nc\n';
  assert.equal(withoutSection(three, 'B'), '## A\n\na\n\n## C\n\nc\n');
  // An absent heading is a no-op, not an error.
  assert.equal(withoutSection(three, 'D'), three);
});
