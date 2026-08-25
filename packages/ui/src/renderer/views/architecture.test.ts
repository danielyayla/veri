import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cellRender, provLabel } from './architecture.ts';

// The view's pure rendering decisions (WO-068): every lattice state maps to
// one glyph/class pair, and the title always cites the governing decision —
// REQ-022's traceability at the cell level.

test('cellRender maps every lattice state to its glyph and class', () => {
  assert.deepEqual(cellRender({ kind: 'self' }), { glyph: '', cls: 'mx-self', title: '' });
  assert.deepEqual(cellRender({ kind: 'unconstrained' }), { glyph: '·', cls: 'mx-cell', title: 'unconstrained' });
  const forbidden = cellRender({ kind: 'rule', allowed: false, decisionId: 'DEC-001', severity: 'advisory', violations: 0, violTier: null });
  assert.deepEqual(forbidden, { glyph: '⨯', cls: 'mx-cell mx-rule mx-forbid', title: 'forbidden (DEC-001)' });
  const allowed = cellRender({ kind: 'rule', allowed: true, decisionId: 'DEC-002', severity: 'advisory', violations: 0, violTier: null });
  assert.deepEqual(allowed, { glyph: '✓', cls: 'mx-cell mx-rule mx-allow', title: 'allowed (DEC-002)' });
});

test('an error-severity rule cell names its severity; a conflict cell names both decisions', () => {
  const error = cellRender({ kind: 'rule', allowed: false, decisionId: 'DEC-001', severity: 'error', violations: 2, violTier: 'error' });
  assert.equal(error.title, 'forbidden (DEC-001 · error)');
  const conflict = cellRender({ kind: 'conflict', allowedBy: ['DEC-004'], forbiddenBy: ['DEC-003'] });
  assert.equal(conflict.glyph, '⚠');
  assert.equal(conflict.cls, 'mx-cell mx-conflict');
  assert.match(conflict.title, /allowed by DEC-004/);
  assert.match(conflict.title, /forbidden by DEC-003/);
});

test('provenance chips never blur declared and discovered', () => {
  assert.equal(provLabel('observed'), 'observed');
  assert.equal(provLabel('declared'), 'declared');
  assert.equal(provLabel('declared + observed'), 'declared + observed');
});
