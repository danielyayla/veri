import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, renameSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { scaffoldProject } from '@verikb/core';
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

test('a fresh scaffold committed while the local date differs from UTC shows no drift (WO-074)', async (t) => {
  // Pin a zone where the local calendar date is guaranteed to differ from
  // the UTC date right now: UTC+14 is a day ahead once UTC passes 10:00,
  // UTC-12 is a day behind until UTC reaches 12:00 (POSIX Etc/GMT signs are
  // inverted, and the Etc zones span GMT-14 east to GMT+12 west).
  // Stamping (scaffoldProject) and committing (spawnSync inherits env) both
  // happen inside that zone, exactly the skew window that used to produce a
  // spurious drift-approved-edited advisory on WF-001's approved: stamp.
  const prevTz = process.env.TZ;
  process.env.TZ = new Date().getUTCHours() >= 10 ? 'Etc/GMT-14' : 'Etc/GMT+12';
  t.after(() => {
    if (prevTz === undefined) delete process.env.TZ;
    else process.env.TZ = prevTz;
  });
  assert.notEqual(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`,
    new Date().toISOString().slice(0, 10),
    'the pinned zone must put the local date on the other side of the UTC boundary',
  );

  const dir = sandbox(t);
  const git = (...args: string[]) => {
    const run = spawnSync('git', args, { cwd: dir, encoding: 'utf8' });
    assert.equal(run.status, 0, run.stderr);
  };
  git('init', '-q');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'Test');
  git('add', '.');
  git('commit', '-q', '-m', 'initial scaffold');

  const snap = await buildSnapshot(dir);
  assert.deepEqual(snap.issues, []);
  assert.deepEqual(
    snap.advisories.filter((advisory) => advisory.kind === 'drift-approved-edited'),
    [],
  );
});

// ---------------------------------------------------------------------------
// WO-093 — the app consumes core's deriveFindings: the snapshot's findings
// and skips must be exactly what the CLI's checkReport derives over the same
// corpus, because both are the same core derivation over each host's facts.
// ---------------------------------------------------------------------------

const REQ_001 = `---
id: REQ-001
type: requirement
title: Fixture requirement
status: accepted
approved: 2026-08-01
created: 2026-08-01
updated: 2026-08-01
links: []
---

It must work.

## Acceptance criteria

- [ ] It works
`;

const WO_BOUND = `---
id: WO-001
type: work-order
title: Bound fixture work order
status: in-progress
created: 2026-08-01
updated: 2026-08-01
links:
  - id: REQ-001
    rel: implements
binds:
  paths:
    - src/**
  tests:
    - tests/gone.test.ts
---

## Summary

Fixture work.

## In scope

- Everything

## Out of scope

- Nothing

## Requirements

- [[REQ-001]] — implements

## Acceptance tests

- [ ] Passes

## Receipts

(none yet)
`;

function flat(entry: { kind?: string; id?: string; file?: string; message: string }): {
  kind?: string;
  id?: string;
  file?: string;
  message: string;
} {
  return { kind: entry.kind, id: entry.id, file: entry.file, message: entry.message };
}

test('snapshot findings equal the CLI report over one bound corpus (WO-093)', async (t) => {
  const { checkReport } = await import('@verikb/cli');
  const dir = sandbox(t);
  writeFileSync(join(dir, 'veri/requirements/REQ-001-fixture.md'), REQ_001);
  writeFileSync(join(dir, 'veri/work-orders/WO-001-bound.md'), WO_BOUND);
  mkdirSync(join(dir, 'src'));
  writeFileSync(join(dir, 'src/main.ts'), 'export const answer = 42;\n');
  const git = (...args: string[]) => {
    const run = spawnSync('git', args, { cwd: dir, encoding: 'utf8' });
    assert.equal(run.status, 0, run.stderr);
  };
  git('init', '-q');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'Test');
  git('add', '.');
  // The subject names no work order: with WO-001's binds claiming src/**,
  // this commit is an unclaimed change (DEC-080).
  git('commit', '-q', '-m', 'initial scaffold');

  const snap = await buildSnapshot(dir);
  const report = await checkReport(dir);
  assert.ok(report !== null);
  assert.deepEqual(snap.issues.map(flat), report.issues.map(flat));
  assert.deepEqual(snap.advisories.map(flat), report.advisories.map(flat));
  assert.deepEqual(snap.skips, report.skips);
  // The two detector families the hand-rolled tier missed are now present.
  assert.ok(snap.advisories.some((advisory) => advisory.kind === 'drift-missing-test'));
  assert.ok(snap.advisories.some((advisory) => advisory.kind === 'drift-unclaimed-change'));
});

test('snapshot skips match the CLI report outside a repository (WO-093, REQ-021)', async (t) => {
  const { checkReport } = await import('@verikb/cli');
  const dir = sandbox(t);
  writeFileSync(join(dir, 'veri/requirements/REQ-001-fixture.md'), REQ_001);
  writeFileSync(join(dir, 'veri/work-orders/WO-001-bound.md'), WO_BOUND);

  const snap = await buildSnapshot(dir);
  const report = await checkReport(dir);
  assert.ok(report !== null);
  assert.deepEqual(snap.skips, report.skips);
  assert.ok(snap.skips.some((note) => note === '(provenance: skipped — not a git repository)'));
  // WO-001 is a binding claimant, so the git-less degradation names the
  // binding-drift tier too — never a silent omission.
  assert.ok(snap.skips.some((note) => note === '(binding drift: skipped — not a git repository)'));
  assert.deepEqual(snap.advisories.map(flat), report.advisories.map(flat));
});

test('snapshot skips match the CLI report in a shallow clone (WO-093, REQ-021)', async (t) => {
  const { checkReport } = await import('@verikb/cli');
  const dir = sandbox(t);
  writeFileSync(join(dir, 'veri/requirements/REQ-001-fixture.md'), REQ_001);
  writeFileSync(join(dir, 'veri/work-orders/WO-001-bound.md'), WO_BOUND);
  const git = (cwd: string, ...args: string[]) => {
    const run = spawnSync('git', args, { cwd, encoding: 'utf8' });
    assert.equal(run.status, 0, run.stderr);
  };
  git(dir, 'init', '-q');
  git(dir, 'config', 'user.email', 'test@example.com');
  git(dir, 'config', 'user.name', 'Test');
  git(dir, 'add', '.');
  git(dir, 'commit', '-q', '-m', 'initial scaffold');
  const shallow = mkdtempSync(join(tmpdir(), 'veri-snapshot-shallow-'));
  t.after(() => rmSync(shallow, { recursive: true, force: true }));
  git(shallow, 'clone', '-q', '--depth', '1', `file://${dir}`, 'clone');
  const cloneDir = join(shallow, 'clone');

  const snap = await buildSnapshot(cloneDir);
  const report = await checkReport(cloneDir);
  assert.ok(report !== null);
  assert.deepEqual(snap.skips, report.skips);
  assert.ok(snap.skips.some((note) => note === '(provenance: skipped — shallow clone — full history is not available)'));
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

// ---- Observed architecture on the snapshot (WO-068) -----------------------

const ARCH_WORKFLOW = `---
id: WF-001
type: workflow
title: Veri project workflow
status: accepted
approved: 2026-08-01
created: 2026-08-01
updated: 2026-08-01
modules:
  - name: alpha
    path: packages/alpha
    purpose: The domain
  - name: beta
    path: packages/beta
    purpose: A surface
---
Rules.
`;

const forbid = (severity: string) => `---
id: DEC-001
type: decision
title: Alpha stays pure
status: active
approved: 2026-08-01
created: 2026-08-01
updated: 2026-08-01
architecture:
  constraints:
    - from: alpha
      to: beta
      allowed: false${severity === '' ? '' : `\n      severity: ${severity}`}
---
## Choice

Alpha imports no surface.
`;

function archSandbox(t: { after(fn: () => void): void }, severity: string): string {
  const dir = sandbox(t);
  writeFileSync(join(dir, 'veri/workflow.md'), ARCH_WORKFLOW);
  writeFileSync(join(dir, 'veri/decisions/DEC-001-alpha-pure.md'), forbid(severity));
  mkdirSync(join(dir, 'packages/alpha/src'), { recursive: true });
  mkdirSync(join(dir, 'packages/beta'), { recursive: true });
  writeFileSync(join(dir, 'packages/alpha/package.json'), JSON.stringify({ name: '@t/alpha' }));
  writeFileSync(join(dir, 'packages/beta/package.json'), JSON.stringify({ name: '@t/beta' }));
  writeFileSync(join(dir, 'packages/alpha/src/index.ts'), "export const pure = 1;\nimport '@t/beta';\n");
  writeFileSync(join(dir, 'packages/beta/index.ts'), 'export const surface = 1;\n');
  return dir;
}

test('the snapshot carries the projection and per-file observed facts; an advisory violation stays grey (WO-068)', async (t) => {
  const dir = archSandbox(t, '');
  const snap = await buildSnapshot(dir);
  assert.deepEqual(snap.issues, []);
  const arch = snap.advisories.filter((a) => a.kind === 'arch-violation');
  assert.equal(arch.length, 1);
  assert.equal(arch[0].id, 'DEC-001');
  assert.deepEqual(snap.architecture.modules.map((m) => m.name), ['alpha', 'beta']);
  assert.equal(snap.architecture.rules.length, 1);
  assert.deepEqual(snap.archObserved.edges, [
    { from: 'alpha', to: 'beta', file: 'packages/alpha/src/index.ts', specifier: '@t/beta' },
  ]);
  // Per-file detail and entry-point exports feed the drill-down and the panel.
  const alphaFiles = snap.archObserved.files.filter((f) => f.module === 'alpha');
  assert.deepEqual(alphaFiles, [{ module: 'alpha', file: 'packages/alpha/src/index.ts', imports: ['@t/beta'] }]);
  assert.deepEqual(snap.archObserved.exports['alpha'], ['pure']);
  assert.deepEqual(snap.archObserved.exports['beta'], ['surface']);
  assert.deepEqual(snap.archObserved.skipped, []);
});

test('an error-severity violation is a snapshot issue — counted, amber, the HEALTH pipeline (DEC-062)', async (t) => {
  const dir = archSandbox(t, 'error');
  const builder = new SnapshotBuilder();
  const snap = await builder.build(dir);
  const issues = snap.issues.filter((i) => i.kind === 'arch-violation');
  assert.equal(issues.length, 1);
  assert.match(issues[0].message, /severity: error/);
  assert.deepEqual(snap.advisories.filter((a) => a.kind === 'arch-violation'), []);
  // The incremental builder carries the same shapes as buildSnapshot.
  assert.deepEqual(snap.architecture, (await buildSnapshot(dir)).architecture);
});

test('no registry → no scan: empty observed shapes and an empty projection, never an error', async (t) => {
  const dir = sandbox(t);
  const snap = await buildSnapshot(dir);
  assert.deepEqual(snap.architecture, { modules: [], rules: [], conflicts: [] });
  assert.deepEqual(snap.archObserved, { edges: [], skipped: [], files: [], exports: {} });
});

test('a registry module missing from disk lands in skipped — the ghosted card, never a failure', async (t) => {
  const dir = archSandbox(t, '');
  rmSync(join(dir, 'packages/beta'), { recursive: true });
  const snap = await buildSnapshot(dir);
  assert.deepEqual(snap.archObserved.skipped.map((m) => m.name), ['beta']);
});
