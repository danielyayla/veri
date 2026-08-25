import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appendToSection } from './sections.ts';

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
