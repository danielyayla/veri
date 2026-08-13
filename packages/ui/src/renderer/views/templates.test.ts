import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TPL_TYPES, fmPreview, saveStateText } from './templates.ts';

test('every built-in type is listed, in SRC-009 order', () => {
  assert.deepEqual(TPL_TYPES, ['requirement', 'decision', 'work-order', 'source', 'workflow']);
});

test('the locked preview shows the frontmatter veri new generates', () => {
  const preview = fmPreview('decision', '2026-08-13');
  assert.equal(
    preview,
    [
      '---',
      'id: DEC-0XX',
      'type: decision',
      'title: (your title)',
      'status: proposed',
      'created: 2026-08-13',
      'updated: 2026-08-13',
      '---',
    ].join('\n'),
  );
  // Placeholder id per type prefix; initial status per type (REQ-008 posture).
  assert.match(fmPreview('work-order', '2026-08-13'), /^id: WO-0XX$/m);
  assert.match(fmPreview('work-order', '2026-08-13'), /^status: backlog$/m);
  assert.match(fmPreview('source', '2026-08-13'), /^status: imported$/m);
});

test('save-state slot: notice wins, then the dirty hint, then saved', () => {
  assert.equal(saveStateText({ dirty: false, notice: null }), 'saved');
  assert.equal(saveStateText({ dirty: true, notice: null }), 'unsaved — ⌘S');
  assert.equal(saveStateText({ dirty: true, notice: { text: 'saved' } }), 'saved');
  assert.equal(saveStateText({ dirty: false, notice: { text: 'reloaded from disk' } }), 'reloaded from disk');
});
