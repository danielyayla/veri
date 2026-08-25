import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { CheckReport } from '@verikb/cli';
import { noProject, readInputs, render } from './report.ts';

const EMPTY: CheckReport = { formatLine: 'format 1 (current)', documentCount: 3, issues: [], advisories: [], skips: [] };

test('readInputs defaults path to . and strict to false', () => {
  assert.deepEqual(readInputs({}), { path: '.', strictAdvisories: false });
  assert.deepEqual(readInputs({ INPUT_PATH: ' app ', 'INPUT_STRICT-ADVISORIES': 'TRUE' }), { path: 'app', strictAdvisories: true });
});

test('a clean report passes with a summary line and no annotations', () => {
  const verdict = render(EMPTY, readInputs({}));
  assert.equal(verdict.code, 0);
  assert.ok(!verdict.lines.some((line) => line.startsWith('::error') || line.startsWith('::warning')));
  assert.equal(verdict.lines.at(-1), 'veri check: ok — 3 documents, 0 advisories');
});

test('issues become error annotations at repo-relative paths and fail the run', () => {
  const report: CheckReport = {
    ...EMPTY,
    issues: [{ file: 'work-orders/WO-001-x.md', message: 'WO-001 links REQ-009, which does not exist' }],
  };
  const verdict = render(report, readInputs({}));
  assert.equal(verdict.code, 1);
  assert.ok(verdict.lines.includes('::error file=veri/work-orders/WO-001-x.md,title=veri check::WO-001 links REQ-009, which does not exist'));
});

test('the path input prefixes annotation paths', () => {
  const report: CheckReport = { ...EMPTY, issues: [{ file: 'requirements/REQ-001-a.md', message: 'bad' }] };
  const verdict = render(report, readInputs({ INPUT_PATH: 'app/' }));
  assert.ok(verdict.lines.some((line) => line.includes('file=app/veri/requirements/REQ-001-a.md')));
});

test('a duplicate-id issue annotates every claiming file', () => {
  const report: CheckReport = {
    ...EMPTY,
    issues: [{ file: 'decisions/DEC-009-a.md, decisions/DEC-009-b.md', message: 'duplicate id DEC-009' }],
  };
  const verdict = render(report, readInputs({}));
  const errors = verdict.lines.filter((line) => line.startsWith('::error'));
  assert.equal(errors.length, 2);
  assert.ok(errors[0].includes('file=veri/decisions/DEC-009-a.md'));
  assert.ok(errors[1].includes('file=veri/decisions/DEC-009-b.md'));
});

test('advisories warn but pass by default', () => {
  const report: CheckReport = {
    ...EMPTY,
    advisories: [{ kind: 'stamp-drift', file: 'requirements/REQ-002-b.md', message: 'body changed after approval' }],
  };
  const verdict = render(report, readInputs({}));
  assert.equal(verdict.code, 0);
  assert.ok(verdict.lines.includes('::warning file=veri/requirements/REQ-002-b.md,title=veri advisory (stamp-drift)::body changed after approval'));
});

test('strict-advisories escalates advisories to a failure with an explanatory error', () => {
  const report: CheckReport = {
    ...EMPTY,
    advisories: [{ kind: 'receipt-prefix', file: 'work-orders/WO-002-c.md', message: 'commit lacks the WO-002: prefix' }],
  };
  const verdict = render(report, readInputs({ 'INPUT_STRICT-ADVISORIES': 'true' }));
  assert.equal(verdict.code, 1);
  assert.ok(verdict.lines.some((line) => line.startsWith('::error') && line.includes('strict-advisories')));
});

test('a shallow-clone skip carries the fetch-depth hint', () => {
  const report: CheckReport = { ...EMPTY, skips: ['(provenance: skipped — shallow clone — full history is not available)'] };
  const verdict = render(report, readInputs({}));
  assert.equal(verdict.code, 0);
  const notice = verdict.lines.find((line) => line.startsWith('::notice'));
  assert.ok(notice !== undefined && notice.includes('fetch-depth: 0'));
});

test('newlines and percents in messages are escaped per workflow-command rules', () => {
  const report: CheckReport = { ...EMPTY, issues: [{ file: 'a.md', message: '100% broken\nsecond line' }] };
  const verdict = render(report, readInputs({}));
  assert.ok(verdict.lines.some((line) => line.endsWith('::100%25 broken%0Asecond line')));
});

test('a missing veri/ directory is an informative failure', () => {
  const verdict = noProject(readInputs({ INPUT_PATH: 'app' }));
  assert.equal(verdict.code, 1);
  assert.ok(verdict.lines[0].startsWith('::error') && verdict.lines[0].includes("'app'"));
});
