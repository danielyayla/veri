import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDocument } from './parse.ts';
import { extractInlineRefs } from './ids.ts';

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

test('id prefix must match document type', () => {
  const outcome = parseDocument('x.md', doc(VALID_FM.replace('id: REQ-001', 'id: DEC-001')));
  assert.equal(outcome.issues.length, 1);
  const issue = outcome.issues[0];
  assert.ok(issue.kind === 'invalid-frontmatter' && issue.field === 'id');
});
