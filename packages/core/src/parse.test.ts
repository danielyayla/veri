import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDocument } from './parse.ts';
import { extractInlineRefs } from './ids.ts';
import { outcomeLabel, requirementKind } from './pending.ts';

const doc = (fm: string, body = 'Body.\n'): string => `---\n${fm}\n---\n\n${body}`;

const VALID_FM = `id: REQ-001
type: requirement
title: A requirement
status: draft
created: 2026-08-01
updated: 2026-08-01`;

test('inline refs are extracted, deduplicated, in order of first appearance', () => {
  const refs = extractInlineRefs('See [[DEC-002]] and [[REQ-001]], also [[DEC-002]] again; not [[ID]] or [[REQ-1]].');
  assert.deepEqual(refs, ['DEC-002', 'REQ-001']);
});

test('unknown frontmatter keys are preserved, not rejected', () => {
  const outcome = parseDocument('x.md', doc(`${VALID_FM}\nowner: daniel`));
  assert.deepEqual(outcome.issues, []);
  assert.equal(outcome.document?.frontmatter['owner'], 'daniel');
});

test('invalid frontmatter names the file, the field, and the problem', () => {
  const outcome = parseDocument('requirements/REQ-001-x.md', doc(VALID_FM.replace('status: draft', 'status: done')));
  assert.equal(outcome.document, undefined);
  assert.equal(outcome.issues.length, 1);
  const issue = outcome.issues[0];
  assert.equal(issue.kind, 'invalid-frontmatter');
  assert.equal(issue.file, 'requirements/REQ-001-x.md');
  assert.ok(issue.kind === 'invalid-frontmatter' && issue.field === 'status');
  assert.match(issue.message, /"status"/);
  assert.match(issue.message, /Invalid enum value|invalid/i);
});

test('a file without a frontmatter block is one clear issue', () => {
  const outcome = parseDocument('x.md', '# Just markdown\n');
  assert.equal(outcome.issues.length, 1);
  assert.equal(outcome.issues[0]?.kind, 'invalid-frontmatter');
  assert.match(outcome.issues[0]?.message ?? '', /missing YAML frontmatter/);
});

// --- Requirement kinds (REQ-032, WO-114) ---

test('a hypothesis requirement with an outcome parses, types, and preserves its frontmatter for round-trip', () => {
  const outcome = parseDocument(
    'x.md',
    doc(`${VALID_FM}\nkind: hypothesis\noutcome:\n  metric: time-to-first-success\n  target: "< 5 minutes"`),
  );
  assert.deepEqual(outcome.issues, []);
  assert.equal(outcome.document?.kind, 'hypothesis');
  assert.deepEqual(outcome.document?.outcome, { metric: 'time-to-first-success', target: '< 5 minutes' });
  assert.equal(requirementKind(outcome.document!), 'hypothesis');
  assert.equal(outcomeLabel(outcome.document!), 'time-to-first-success < 5 minutes');
  // Round-trip: the validated frontmatter record keeps both fields, so the
  // save path (verbatim buffer) and any re-serialization never drop them.
  assert.equal(outcome.document?.frontmatter['kind'], 'hypothesis');
  assert.deepEqual(outcome.document?.frontmatter['outcome'], {
    metric: 'time-to-first-success',
    target: '< 5 minutes',
  });
});

test('a bare-number outcome target normalizes to a string', () => {
  const outcome = parseDocument('x.md', doc(`${VALID_FM}\nkind: hypothesis\noutcome:\n  metric: nps\n  target: 40`));
  assert.deepEqual(outcome.issues, []);
  assert.deepEqual(outcome.document?.outcome, { metric: 'nps', target: '40' });
});

test('absent kind means constraint — no invented field, the default via requirementKind', () => {
  const outcome = parseDocument('x.md', doc(VALID_FM));
  assert.deepEqual(outcome.issues, []);
  assert.equal(outcome.document?.kind, undefined);
  assert.equal(outcome.document?.outcome, undefined);
  assert.equal('kind' in (outcome.document?.frontmatter ?? {}), false);
  assert.equal(requirementKind(outcome.document!), 'constraint');
  assert.equal(outcomeLabel(outcome.document!), null);
});

test('a malformed kind or outcome is an invalid-frontmatter issue, never a silent no-op', () => {
  const badKind = parseDocument('x.md', doc(`${VALID_FM}\nkind: guess`));
  assert.equal(badKind.document, undefined);
  assert.ok(badKind.issues.some((i) => i.kind === 'invalid-frontmatter' && i.field === 'kind'));

  const badOutcome = parseDocument('x.md', doc(`${VALID_FM}\noutcome:\n  target: "< 5 minutes"`));
  assert.equal(badOutcome.document, undefined);
  assert.ok(badOutcome.issues.some((i) => i.kind === 'invalid-frontmatter' && i.field === 'outcome.metric'));
});

test('id prefix must match document type', () => {
  const outcome = parseDocument('x.md', doc(VALID_FM.replace('id: REQ-001', 'id: DEC-001')));
  assert.equal(outcome.issues.length, 1);
  const issue = outcome.issues[0];
  assert.ok(issue.kind === 'invalid-frontmatter' && issue.field === 'id');
});

// --- The verify command (REQ-042, WO-145) ---

const WO_FM = `id: WO-001
type: work-order
title: A work order
status: backlog
created: 2026-09-01
updated: 2026-09-01`;

test('a work order with verify: parses, types, and preserves the command for round-trip', () => {
  const outcome = parseDocument('x.md', doc(`${WO_FM}\nverify: npm test`));
  assert.deepEqual(outcome.issues, []);
  assert.equal(outcome.document?.verify, 'npm test');
  // Round-trip: the validated frontmatter record keeps the field, so the
  // save path (verbatim buffer) and any re-serialization never drop it.
  assert.equal(outcome.document?.frontmatter['verify'], 'npm test');
});

test('absent verify: stays absent — a work order without the field behaves exactly as today', () => {
  const outcome = parseDocument('x.md', doc(WO_FM));
  assert.deepEqual(outcome.issues, []);
  assert.equal(outcome.document?.verify, undefined);
  assert.equal('verify' in (outcome.document?.frontmatter ?? {}), false);
});

test('a malformed verify: is an invalid-frontmatter issue, never a silent no-op', () => {
  const empty = parseDocument('x.md', doc(`${WO_FM}\nverify: ""`));
  assert.equal(empty.document, undefined);
  assert.ok(empty.issues.some((i) => i.kind === 'invalid-frontmatter' && i.field === 'verify'));

  const list = parseDocument('x.md', doc(`${WO_FM}\nverify:\n  - npm test\n  - npm run lint`));
  assert.equal(list.document, undefined);
  assert.ok(list.issues.some((i) => i.kind === 'invalid-frontmatter' && i.field === 'verify'));

  const mapping = parseDocument('x.md', doc(`${WO_FM}\nverify:\n  command: npm test`));
  assert.equal(mapping.document, undefined);
  assert.ok(mapping.issues.some((i) => i.kind === 'invalid-frontmatter' && i.field === 'verify'));
});
