import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, renameSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { scaffoldProject } from '@veri/core';
import { SnapshotBuilder, buildSnapshot, countProjectDocs } from './snapshot.ts';

function sandbox(t: { after(fn: () => void): void }): string {
  const dir = mkdtempSync(join(tmpdir(), 'veri-snapshot-test-'));
  scaffoldProject(dir);
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

const BARE_REQ = `---
id: REQ-001
type: requirement
title: Bare
status: draft
created: 2026-08-13
updated: 2026-08-13
---
(prose, no sections)
`;

test('snapshot carries both tiers; advisories never touch the issue list', async (t) => {
  const dir = sandbox(t);
  writeFileSync(join(dir, 'veri/requirements/REQ-001-bare.md'), BARE_REQ);

  const snap = await buildSnapshot(dir);
  assert.deepEqual(snap.issues, []);
  assert.deepEqual(snap.advisories, [
    {
      kind: 'missing-section',
      file: 'requirements/REQ-001-bare.md',
      id: 'REQ-001',
      section: 'Acceptance criteria',
      message: 'REQ-001 has no "## Acceptance criteria" section — the requirement template expects one',
    },
  ]);
});

test('editing the effective template changes advisories on the next snapshot (DEC-002)', async (t) => {
  const dir = sandbox(t);
  writeFileSync(join(dir, 'veri/requirements/REQ-001-bare.md'), BARE_REQ);
  assert.equal((await buildSnapshot(dir)).advisories.length, 1);

  // A template with no ## headings expects nothing — the advisory clears
  // with no restart, no cache, nothing but the next rebuild.
  writeFileSync(join(dir, 'veri/templates/requirement.md'), '(free-form)\n');
  const snap = await buildSnapshot(dir);
  assert.deepEqual(snap.advisories, []);
  assert.deepEqual(snap.issues, []);
});

test('this host collects git facts: git-backed drift joins the snapshot advisory tier (WO-045)', async (t) => {
  const { spawnSync } = await import('node:child_process');
  const dir = sandbox(t);
  const git = (...args: string[]) => {
    const run = spawnSync('git', args, { cwd: dir, encoding: 'utf8' });
    assert.equal(run.status, 0, run.stderr);
  };
  git('init', '-q');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'Test');
  const decision = join(dir, 'veri/decisions/DEC-001-a-choice.md');
  const write = (body: string) =>
    writeFileSync(
      decision,
      `---\nid: DEC-001\ntype: decision\ntitle: A choice\nstatus: active\napproved: 2026-08-10\ncreated: 2026-08-01\nupdated: 2026-08-01\n---\n\n## Choice\n\n${body}\n\n## Rejected alternatives\n\n- none\n\n## Rationale\n\nbecause\n`,
    );
  write('The original choice.');
  git('add', '.');
  git('commit', '-q', '-m', 'DEC-001: approved');
  write('A quietly different choice.');
  git('add', '.');
  git('commit', '-q', '-m', 'tweak the wording');

  const snap = await buildSnapshot(dir);
  assert.deepEqual(snap.issues, []);
  const drift = snap.advisories.filter((advisory) => advisory.kind === 'drift-approved-edited');
  assert.equal(drift.length, 1);
  assert.match(drift[0].message, /DEC-001 was approved 2026-08-10 but its file changed afterwards/);
});

// ---------------------------------------------------------------------------
// WO-051 — incremental snapshots. The invariant: an incremental build after
// any sequence of file events deep-equals a from-scratch buildSnapshot.
// ---------------------------------------------------------------------------

function gitSandbox(t: { after(fn: () => void): void }): { dir: string; git: (...args: string[]) => void } {
  const dir = sandbox(t);
  const git = (...args: string[]) => {
    const run = spawnSync('git', args, { cwd: dir, encoding: 'utf8' });
    assert.equal(run.status, 0, run.stderr);
  };
  git('init', '-q');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'Test');
  return { dir, git };
}

const doc = (id: string, title: string, body: string): string =>
  `---\nid: ${id}\ntype: requirement\ntitle: ${title}\nstatus: draft\ncreated: 2026-08-13\nupdated: 2026-08-13\n---\n\n${body}\n\n## Acceptance criteria\n\n- [ ] one\n`;

/** The WO-051 invariant, asserted: incremental deep-equals from-scratch. */
async function assertMatchesColdBuild(builder: SnapshotBuilder, dir: string): Promise<void> {
  assert.deepEqual(await builder.build(dir), await buildSnapshot(dir));
}

test('incremental build deep-equals a cold build across an arbitrary event sequence (WO-051)', async (t) => {
  const { dir, git } = gitSandbox(t);
  const builder = new SnapshotBuilder();
  writeFileSync(join(dir, 'veri/requirements/REQ-001-one.md'), doc('REQ-001', 'One', 'First.'));
  git('add', '.');
  git('commit', '-q', '-m', 'REQ-001: initial');
  await assertMatchesColdBuild(builder, dir);

  // Edit one file.
  writeFileSync(join(dir, 'veri/requirements/REQ-001-one.md'), doc('REQ-001', 'One', 'First, edited.'));
  await assertMatchesColdBuild(builder, dir);

  // Add — a valid document, and a broken one (issues path).
  writeFileSync(join(dir, 'veri/requirements/REQ-002-two.md'), doc('REQ-002', 'Two', 'Second.'));
  writeFileSync(join(dir, 'veri/sources/SRC-001-bad.md'), 'no frontmatter at all\n');
  await assertMatchesColdBuild(builder, dir);

  // Delete.
  unlinkSync(join(dir, 'veri/sources/SRC-001-bad.md'));
  await assertMatchesColdBuild(builder, dir);

  // Rename.
  renameSync(join(dir, 'veri/requirements/REQ-002-two.md'), join(dir, 'veri/requirements/REQ-002-renamed.md'));
  await assertMatchesColdBuild(builder, dir);

  // Template change — advisories derive from the effective template (DEC-002).
  writeFileSync(join(dir, 'veri/templates/requirement.md'), '(free-form)\n');
  await assertMatchesColdBuild(builder, dir);

  // A commit landing (HEAD moves).
  git('add', '.');
  git('commit', '-q', '-m', 'REQ-002: more work');
  await assertMatchesColdBuild(builder, dir);

  const final = await builder.build(dir);
  assert.deepEqual(
    final.documents.map((d) => d.id).filter((id) => id.startsWith('REQ')),
    ['REQ-001', 'REQ-002'],
  );
});

test('editing one document re-parses only that document; unchanged docs are reused by reference (WO-051)', async (t) => {
  const dir = sandbox(t);
  writeFileSync(join(dir, 'veri/requirements/REQ-001-one.md'), doc('REQ-001', 'One', 'First.'));
  writeFileSync(join(dir, 'veri/requirements/REQ-002-two.md'), doc('REQ-002', 'Two', 'Second.'));
  const builder = new SnapshotBuilder();
  const first = await builder.build(dir);
  const coldParses = builder.parseCount;
  assert.deepEqual(first.issues, []);
  assert.equal(coldParses, first.documents.length, 'a cold build parses every file exactly once');
  assert.ok(coldParses >= 3); // scaffolded workflow + the two requirements

  writeFileSync(join(dir, 'veri/requirements/REQ-002-two.md'), doc('REQ-002', 'Two', 'Second, edited.'));
  const second = await builder.build(dir);
  assert.equal(builder.parseCount, coldParses + 1, 'exactly one re-parse after a one-file edit');

  const one1 = first.documents.find((d) => d.id === 'REQ-001');
  const one2 = second.documents.find((d) => d.id === 'REQ-001');
  assert.ok(one1 === one2, 'unchanged document is the same object, reused by reference');

  // No changes at all: a rebuild parses nothing.
  await builder.build(dir);
  assert.equal(builder.parseCount, coldParses + 1);
});

test('the full-history git log re-runs only when HEAD moves; drift still updates on commit (WO-051)', async (t) => {
  const { dir, git } = gitSandbox(t);
  const decision = join(dir, 'veri/decisions/DEC-001-a-choice.md');
  const write = (body: string) =>
    writeFileSync(
      decision,
      `---\nid: DEC-001\ntype: decision\ntitle: A choice\nstatus: active\napproved: 2026-08-10\ncreated: 2026-08-01\nupdated: 2026-08-01\n---\n\n## Choice\n\n${body}\n\n## Rejected alternatives\n\n- none\n\n## Rationale\n\nbecause\n`,
    );
  write('The original choice.');
  git('add', '.');
  git('commit', '-q', '-m', 'DEC-001: approved');

  const builder = new SnapshotBuilder();
  const clean = await builder.build(dir);
  assert.equal(builder.gitFactsCount, 1);
  assert.equal(clean.advisories.filter((a) => a.kind === 'drift-approved-edited').length, 0);

  // Worktree-only change: the dirty flag flips, facts collection does not re-run.
  write('A quietly different choice.');
  const dirty = await builder.build(dir);
  assert.equal(builder.gitFactsCount, 1, 'a dirty flip alone re-runs no git log');
  assert.equal(dirty.git?.dirty, true);
  assert.equal(dirty.advisories.filter((a) => a.kind === 'drift-approved-edited').length, 0);
  await assertMatchesColdBuild(builder, dir);

  // The edit lands: HEAD moves, facts re-collect, the drift advisory appears.
  git('add', '.');
  git('commit', '-q', '-m', 'tweak the wording');
  const drifted = await builder.build(dir);
  assert.equal(builder.gitFactsCount, 2, 'a HEAD move re-collects git facts');
  assert.equal(drifted.advisories.filter((a) => a.kind === 'drift-approved-edited').length, 1);
  await assertMatchesColdBuild(builder, dir);
});

test('doubt falls back to a full load: a dangling symlink still matches the cold build (WO-051)', async (t) => {
  const dir = sandbox(t);
  writeFileSync(join(dir, 'veri/requirements/REQ-001-one.md'), doc('REQ-001', 'One', 'First.'));
  const builder = new SnapshotBuilder();
  await builder.build(dir);
  assert.equal(builder.fullLoadCount, 0);

  // readdir lists it; stat (which follows symlinks) fails on it.
  symlinkSync(join(dir, 'veri/requirements/missing.md'), join(dir, 'veri/requirements/REQ-099-gone.md'));
  await assertMatchesColdBuild(builder, dir);
  assert.ok(builder.fullLoadCount >= 1, 'stat failure fell back to loadProject');

  // Recovery: remove the doubt and the incremental path resumes, still equal.
  unlinkSync(join(dir, 'veri/requirements/REQ-099-gone.md'));
  await assertMatchesColdBuild(builder, dir);
});

test('countProjectDocs is the readdir truth: .md under veri/, templates excluded, no parse (WO-051)', async (t) => {
  const dir = sandbox(t);
  writeFileSync(join(dir, 'veri/requirements/REQ-001-one.md'), doc('REQ-001', 'One', 'First.'));
  writeFileSync(join(dir, 'veri/sources/SRC-001-bad.md'), 'not parseable as a document\n');
  writeFileSync(join(dir, 'veri/templates/requirement.md'), '(free-form)\n');
  const count = await countProjectDocs(dir);
  const cold = await buildSnapshot(dir);
  // The unparseable file still counts — the light stat counts files, not parses.
  assert.equal(count, cold.documents.length + 1);
  assert.equal(await countProjectDocs(join(dir, 'nowhere')), 0);
});
