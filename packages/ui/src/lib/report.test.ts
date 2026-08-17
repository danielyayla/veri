import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildIssueUrl } from './report.ts';

test('issue URL targets the bug template with both versions prefilled', () => {
  const url = new URL(buildIssueUrl('0.1.3', '13.4'));
  assert.equal(url.origin + url.pathname, 'https://github.com/danielyayla/veri/issues/new');
  assert.equal(url.searchParams.get('template'), 'bug_report.yml');
  assert.equal(url.searchParams.get('app-version'), '0.1.3');
  assert.equal(url.searchParams.get('macos-version'), '13.4');
});

test('version strings are URL-encoded intact', () => {
  const url = new URL(buildIssueUrl('0.2.0-beta.1', '26.0 (Build 25A123)'));
  assert.equal(url.searchParams.get('app-version'), '0.2.0-beta.1');
  assert.equal(url.searchParams.get('macos-version'), '26.0 (Build 25A123)');
});
