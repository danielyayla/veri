/** The discard affordance's pure policy and copy (WO-110, SRC-052). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { VeriDocument } from '@verikb/core';
import { deleteCaption, deleteToast, discardOffered, withdrawCaption, withdrawToast } from './discardlogic.ts';

function doc(type: VeriDocument['type'], status: string): VeriDocument {
  return {
    id: 'DEC-001',
    type,
    title: 'A decision',
    status,
    created: '2026-08-26',
    updated: '2026-08-26',
    links: [],
    frontmatter: {},
    body: '',
    file: 'decisions/DEC-001-a-decision.md',
    inlineRefs: [],
  };
}

test('discard is offered on every withdrawable document', () => {
  assert.ok(discardOffered(doc('requirement', 'draft')));
  assert.ok(discardOffered(doc('decision', 'proposed')));
  assert.ok(discardOffered(doc('decision', 'active')));
  assert.ok(discardOffered(doc('work-order', 'backlog')));
  assert.ok(discardOffered(doc('source', 'imported')));
});

test('discard is absent on the workflow doc and on anything already withdrawn', () => {
  assert.equal(discardOffered(doc('workflow', 'accepted')), false);
  for (const type of ['requirement', 'decision', 'work-order', 'source'] as const) {
    assert.equal(discardOffered(doc(type, 'withdrawn')), false, type);
  }
});

test('the withdraw copy names the document and states that file and inbound links are kept', () => {
  const cap = withdrawCaption('DEC-001');
  assert.match(cap, /DEC-001/);
  assert.match(cap, /Keeps the file and its inbound links/);
  assert.match(cap, /withdrawn/);
  const toast = withdrawToast('DEC-001');
  assert.match(toast, /DEC-001 withdrawn/);
  assert.match(toast, /file and inbound links kept/);
});

test('the delete copy names the file and why the guard allows it', () => {
  const cap = deleteCaption('DEC-001', 'decisions/DEC-001-a-decision.md');
  assert.match(cap, /veri\/decisions\/DEC-001-a-decision\.md/);
  assert.match(cap, /never approved and nothing references it/);
  assert.match(deleteToast('DEC-001', 'decisions/DEC-001-a-decision.md'), /DEC-001 deleted/);
});
