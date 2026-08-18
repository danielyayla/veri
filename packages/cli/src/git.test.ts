import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { collectGitFacts } from './git.ts';
import { check, implemented } from './commands.ts';
import { init } from './commands.ts';

function tempDir(): string {
  return mkdtempSync(join(tmpdir(), 'veri-git-test-'));
}

function git(cwd: string, ...args: string[]): void {
  const run = spawnSync('git', args, { cwd, encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
}

/** A repo with one WO-prefixed commit touching src/thing.ts. */
function repoWithHistory(cwd: string): void {
  git(cwd, 'init', '-q');
  git(cwd, 'config', 'user.email', 'test@example.com');
  git(cwd, 'config', 'user.name', 'Test');
  writeFileSync(join(cwd, 'thing.ts'), 'export {};\n');
  git(cwd, 'add', 'thing.ts');
  git(cwd, 'commit', '-q', '-m', 'WO-001: build the thing');
}

test('collectGitFacts reports not-a-repository as unavailable, not an error', (t) => {
  const cwd = tempDir();
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const result = collectGitFacts(cwd);
  assert.equal(result.kind, 'unavailable');
  assert.match((result as { reason: string }).reason, /not a git repository/);
});

test('collectGitFacts parses sha, subject, and files from real history', (t) => {
  const cwd = tempDir();
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  repoWithHistory(cwd);
  const result = collectGitFacts(cwd);
  assert.equal(result.kind, 'ok');
  const facts = (result as { facts: { commits: Array<{ sha: string; subject: string; files: string[] }> } }).facts;
  assert.equal(facts.commits.length, 1);
  assert.match(facts.commits[0].sha, /^[0-9a-f]{40}$/);
  assert.equal(facts.commits[0].subject, 'WO-001: build the thing');
  assert.deepEqual(facts.commits[0].files, ['thing.ts']);
});

test('veri implemented lists work orders from history, without needing a veri/ project', (t) => {
  const cwd = tempDir();
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  repoWithHistory(cwd);
  const result = implemented(cwd, 'thing.ts');
  return result.then((r) => {
    assert.equal(r.code, 0);
    assert.equal(r.lines.length, 1);
    assert.match(r.lines[0], /^WO-001\s+[0-9a-f]{7}$/);
  });
});

test('veri implemented decorates with titles when a veri/ project is present', async (t) => {
  const cwd = tempDir();
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  repoWithHistory(cwd);
  init(cwd, { demo: false });
  writeFileSync(
    join(cwd, 'veri/work-orders/WO-001-thing.md'),
    [
      '---',
      'id: WO-001',
      'type: work-order',
      'title: Build the thing',
      'status: backlog',
      'created: 2026-08-18',
      'updated: 2026-08-18',
      '---',
      '',
      '## Receipts',
      '',
      '(none yet)',
      '',
    ].join('\n'),
  );
  const result = await implemented(cwd, 'thing.ts');
  assert.equal(result.code, 0);
  assert.match(result.lines[0], /^WO-001\s+[0-9a-f]{7}\s+Build the thing$/);
});

test('veri implemented outside a repository degrades to a message, exit 1', async (t) => {
  const cwd = tempDir();
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const result = await implemented(cwd, 'thing.ts');
  assert.equal(result.code, 1);
  assert.match(result.lines[0], /not a git repository/);
});

test('check outside a repository notes the provenance skip and still passes', async (t) => {
  const cwd = tempDir();
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  init(cwd, { demo: false });
  const result = await check(cwd);
  assert.equal(result.code, 0);
  assert.ok(
    result.lines.some((line) => line === '(provenance: skipped — not a git repository)'),
    result.lines.join('\n'),
  );
});

test('check inside a repository surfaces receipt advisories without failing', async (t) => {
  const cwd = tempDir();
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  repoWithHistory(cwd);
  init(cwd, { demo: false });
  writeFileSync(
    join(cwd, 'veri/work-orders/WO-001-thing.md'),
    [
      '---',
      'id: WO-001',
      'type: work-order',
      'title: Build the thing',
      'status: backlog',
      'created: 2026-08-18',
      'updated: 2026-08-18',
      '---',
      '',
      '## Receipts',
      '',
      '- 2026-08-18 — 9999fff — thing.ts — a receipt citing a commit that never existed',
      '',
    ].join('\n'),
  );
  const result = await check(cwd);
  assert.equal(result.code, 0, result.lines.join('\n'));
  assert.ok(
    result.lines.some((line) => line.includes('citing commit 9999fff')),
    result.lines.join('\n'),
  );
});
