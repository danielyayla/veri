import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CURRENT_FORMAT, assembleContext } from '@verikb/core';
import { approve, architecture, check, checkReport, context, del, importFile, importPrompt, init, list, listStarters, migrate, newDoc, next, open, renumber, start, supersede, withdraw } from './commands.ts';

const REPO_ROOT = fileURLToPath(new URL('../../..', import.meta.url));
const FIVE_ISSUES = fileURLToPath(new URL('../fixtures/five-issues', import.meta.url));

function tempProject(): string {
  return mkdtempSync(join(tmpdir(), 'veri-cli-test-'));
}

test('init && new requirement && check succeeds end-to-end in a temp directory', async (t) => {
  const cwd = tempProject();
  t.after(() => rmSync(cwd, { recursive: true, force: true }));

  assert.equal(init(cwd, { demo: false }).code, 0);
  const created = await newDoc(cwd, 'requirement', 'User authentication');
  assert.equal(created.code, 0);

  const file = join(cwd, 'veri/requirements/REQ-001-user-authentication.md');
  assert.ok(existsSync(file), 'expected REQ-001-user-authentication.md to exist');
  const content = readFileSync(file, 'utf8');
  assert.match(content, /^id: REQ-001$/m);
  assert.match(content, /^status: draft$/m);
  assert.match(content, /## Acceptance criteria/);

  const checked = await check(cwd);
  assert.equal(checked.code, 0, checked.lines.join('\n'));
  // The format line leads the report (REQ-015); a fresh scaffold is current.
  assert.equal(checked.lines[0], `format ${CURRENT_FORMAT} (current)`);
  assert.match(checked.lines.at(-1) ?? '', /ok — 2 documents, 0 issues/); // WF-001 + REQ-001
});

test('new documents are born unapproved and veri approve promotes them with a stamp', async (t) => {
  const cwd = tempProject();
  t.after(() => rmSync(cwd, { recursive: true, force: true }));

  init(cwd, { demo: false });
  await newDoc(cwd, 'decision', 'Pick a widget');
  const file = join(cwd, 'veri/decisions/DEC-001-pick-a-widget.md');
  assert.match(readFileSync(file, 'utf8'), /^status: proposed$/m);

  const approved = await approve(cwd, 'DEC-001');
  assert.equal(approved.code, 0, approved.lines.join('\n'));
  assert.match(approved.lines[0] ?? '', /^DEC-001 proposed → active — approved: \d{4}-\d{2}-\d{2}/);
  const content = readFileSync(file, 'utf8');
  assert.match(content, /^status: active$/m);
  assert.match(content, /^approved: \d{4}-\d{2}-\d{2}$/m);
  assert.equal((await check(cwd)).code, 0);

  // Approving again re-stamps in place (WO-045's drift remedy).
  const again = await approve(cwd, 'DEC-001');
  assert.equal(again.code, 0, again.lines.join('\n'));
  assert.match(again.lines[0] ?? '', /^DEC-001 active → active — approved: \d{4}-\d{2}-\d{2}/);
  assert.equal((await approve(cwd, undefined)).code, 1);
});

test('a work order promotes to ready and veri next serves the queue head (WO-098)', async (t) => {
  const cwd = tempProject();
  t.after(() => rmSync(cwd, { recursive: true, force: true }));

  init(cwd, { demo: false });
  await newDoc(cwd, 'requirement', 'User authentication');
  await newDoc(cwd, 'work-order', 'Build the login flow');
  const woFile = join(cwd, 'veri/work-orders/WO-001-build-the-login-flow.md');
  writeFileSync(
    woFile,
    readFileSync(woFile, 'utf8').replace(/^updated: (.*)$/m, 'updated: $1\nlinks:\n  - id: REQ-001\n    rel: implements'),
  );

  // Empty queue: exit 1, a hint, nothing dispatchable.
  assert.equal((await next(cwd)).code, 1);

  // The stamp path is gated: the linked requirement is still draft.
  const refused = await approve(cwd, 'WO-001');
  assert.equal(refused.code, 1);
  assert.match(refused.lines.join('\n'), /depends on REQ-001, which is still draft/);

  await approve(cwd, 'REQ-001');
  const readied = await approve(cwd, 'WO-001');
  assert.equal(readied.code, 0, readied.lines.join('\n'));
  assert.match(readied.lines[0] ?? '', /^WO-001 backlog → ready — approved: \d{4}-\d{2}-\d{2}/);
  assert.match(readFileSync(woFile, 'utf8'), /^status: ready$/m);
  assert.equal((await check(cwd)).code, 0);

  // The queue head is one tab-separated machine-readable line.
  const head = await next(cwd);
  assert.equal(head.code, 0);
  assert.equal(head.lines[0], `WO-001\tBuild the login flow\tveri/work-orders/WO-001-build-the-login-flow.md`);

  // Execution spends the clearance: in-progress leaves the queue.
  writeFileSync(woFile, readFileSync(woFile, 'utf8').replace('status: ready', 'status: in-progress\nclaimed_by: session-a\nclaimed_at: 2026-08-01'));
  assert.equal((await next(cwd)).code, 1);
});

test('veri start claims the queue head and refuses uncleared or already-claimed work (WO-099)', async (t) => {
  const cwd = tempProject();
  t.after(() => rmSync(cwd, { recursive: true, force: true }));

  init(cwd, { demo: false });
  await newDoc(cwd, 'requirement', 'User authentication');
  await newDoc(cwd, 'work-order', 'Build the login flow');
  const woFile = join(cwd, 'veri/work-orders/WO-001-build-the-login-flow.md');
  writeFileSync(
    woFile,
    readFileSync(woFile, 'utf8').replace(/^updated: (.*)$/m, 'updated: $1\nlinks:\n  - id: REQ-001\n    rel: implements'),
  );

  // Backlog is not dispatchable: only cleared work starts.
  const early = await start(cwd, 'WO-001', 'agent-a');
  assert.equal(early.code, 1);
  assert.match(early.lines.join('\n'), /only cleared work starts.*veri approve WO-001/s);

  await approve(cwd, 'REQ-001');
  await approve(cwd, 'WO-001');
  const started = await start(cwd, 'WO-001', 'agent-a');
  assert.equal(started.code, 0, started.lines.join('\n'));
  assert.match(started.lines[0] ?? '', /^WO-001 ready → in-progress — claimed by agent-a \(\d{4}-\d{2}-\d{2}\)/);
  // The hint names the start-commit convention the era anchor recognizes.
  assert.match(started.lines[1] ?? '', /WO-001: started/);
  const content = readFileSync(woFile, 'utf8');
  assert.match(content, /^status: in-progress\nclaimed_by: agent-a\nclaimed_at: \d{4}-\d{2}-\d{2}$/m);

  // The claim holds against a second session, and the corpus stays check-clean.
  const contested = await start(cwd, 'WO-001', 'agent-b');
  assert.equal(contested.code, 1);
  assert.match(contested.lines.join('\n'), /already in-progress, claimed by "agent-a"/);
  assert.equal((await check(cwd)).code, 0);
  // Started work leaves the queue.
  assert.equal((await next(cwd)).code, 1);
});

test('ids allocate sequentially per type', async (t) => {
  const cwd = tempProject();
  t.after(() => rmSync(cwd, { recursive: true, force: true }));

  init(cwd, { demo: false });
  await newDoc(cwd, 'requirement', 'First');
  await newDoc(cwd, 'requirement', 'Second');
  await newDoc(cwd, 'decision', 'Own counter');
  assert.ok(existsSync(join(cwd, 'veri/requirements/REQ-002-second.md')));
  assert.ok(existsSync(join(cwd, 'veri/decisions/DEC-001-own-counter.md')));
});

test('every document type gets its template and initial status', async (t) => {
  const cwd = tempProject();
  t.after(() => rmSync(cwd, { recursive: true, force: true }));

  init(cwd, { demo: false });
  await newDoc(cwd, 'work-order', 'Build a thing');
  await newDoc(cwd, 'source', 'Old notes');

  const wo = readFileSync(join(cwd, 'veri/work-orders/WO-001-build-a-thing.md'), 'utf8');
  assert.match(wo, /^status: backlog$/m);
  for (const section of ['Summary', 'In scope', 'Out of scope', 'Requirements', 'Acceptance tests', 'Receipts']) {
    assert.match(wo, new RegExp(`^## ${section}$`, 'm'));
  }
  const src = readFileSync(join(cwd, 'veri/sources/SRC-001-old-notes.md'), 'utf8');
  assert.match(src, /^status: imported$/m);
});

test('init --demo installs skiff; check reports exactly the 2 intended issues', async (t) => {
  const cwd = tempProject();
  t.after(() => rmSync(cwd, { recursive: true, force: true }));

  const result = init(cwd, { demo: true });
  assert.equal(result.code, 0, result.lines.join('\n'));
  assert.ok(existsSync(join(cwd, 'README.md')), 'demo README should be installed');
  assert.ok(existsSync(join(cwd, 'CLAUDE.md')), 'demo CLAUDE.md should be installed');

  const listed = await list(cwd, undefined);
  assert.equal(listed.lines.length, 17, listed.lines.join('\n'));
  assert.match(listed.lines.join('\n'), /WO-002 {3}in-progress {2}PDF export pipeline/);

  const checked = await check(cwd);
  assert.equal(checked.code, 1);
  // The two intended issues, plus the advisories the demo keeps on purpose:
  // stale claims from its frozen claim dates (WO-099) and the two
  // evidence-less requirements' intuition-only flags (REQ-038) — advisories
  // whisper, so the demo's teaching issues stay exactly two.
  assert.equal(checked.lines.at(-1), '2 issue(s) · 3 advisories', checked.lines.join('\n'));
  const issues = checked.lines.slice(1, -1).join('\n');
  assert.match(issues, /WO-004/, 'WO-004 must be flagged for its missing requirement');
  assert.match(issues, /SRC-003/, 'REQ-004 must be flagged for its broken SRC-003 link');
  assert.match(issues, /stale-claim|stale after/, 'the demo claims must surface as stale-claim advisories');
});

test('init --demo keeps an existing README.md and refuses an existing veri/', (t) => {
  const cwd = tempProject();
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  writeFileSync(join(cwd, 'README.md'), 'mine\n');
  const result = init(cwd, { demo: true });
  assert.equal(result.code, 0);
  assert.equal(readFileSync(join(cwd, 'README.md'), 'utf8'), 'mine\n', 'must not clobber an existing README');
  assert.match(result.lines.join('\n'), /Skipped README\.md/);
  assert.equal(init(cwd, { demo: true }).code, 1, 'second --demo run must refuse');
});

test('init --starter seeds a check-clean corpus per bundle, every document pending, ids floor correct', async (t) => {
  const starters = listStarters();
  assert.deepEqual(starters, ['cli-tool', 'library', 'web-app'], 'the shipped bundle set (WO-091)');
  for (const name of starters) {
    const cwd = tempProject();
    t.after(() => rmSync(cwd, { recursive: true, force: true }));

    const result = init(cwd, { demo: false, starter: name });
    assert.equal(result.code, 0, result.lines.join('\n'));
    assert.match(result.lines[0] ?? '', new RegExp(`Installed the ${name} starter: 7 seed documents`));

    // Zero issues AND zero advisories: the seed corpus is check-clean (WO-091).
    const checked = await check(cwd);
    assert.equal(checked.code, 0, `${name}: ${checked.lines.join('\n')}`);
    assert.match(checked.lines.at(-1) ?? '', /ok — 7 documents, 0 issues · 0 advisories/, `${name}: ${checked.lines.join('\n')}`);

    // Every seeded requirement draft, every decision proposed, the workflow
    // draft — and no approved: stamp anywhere (REQ-008: promotion is the
    // owner's act, never shipped).
    const veriDir = join(cwd, 'veri');
    const seeded = ['workflow.md']
      .concat(['requirements', 'decisions'].flatMap((sub) => cpDirList(veriDir, sub)))
      .map((file) => [file, readFileSync(join(veriDir, file), 'utf8')] as const);
    assert.equal(seeded.length, 7, seeded.map(([file]) => file).join(', '));
    for (const [file, content] of seeded) {
      if (file.startsWith('requirements/')) assert.match(content, /^status: draft$/m, file);
      if (file.startsWith('decisions/')) assert.match(content, /^status: proposed$/m, file);
      if (file === 'workflow.md') assert.match(content, /^status: draft$/m, file);
      assert.doesNotMatch(content, /^approved:/m, `${name}/${file} must ship unapproved`);
    }

    // The ids floor holds: the next filings allocate past the bundle.
    assert.equal((await newDoc(cwd, 'requirement', 'My own first requirement')).code, 0);
    assert.ok(existsSync(join(veriDir, 'requirements/REQ-005-my-own-first-requirement.md')), `${name}: next REQ id`);
    assert.equal((await newDoc(cwd, 'decision', 'My own first decision')).code, 0);
    assert.ok(existsSync(join(veriDir, 'decisions/DEC-003-my-own-first-decision.md')), `${name}: next DEC id`);
    assert.equal((await check(cwd)).code, 0);
  }
});

function cpDirList(veriDir: string, sub: string): string[] {
  return readdirSync(join(veriDir, sub))
    .filter((entry) => entry.endsWith('.md'))
    .map((entry) => `${sub}/${entry}`);
}

test('init --starter rejects unknown or missing names with the available list, and --demo conflicts', (t) => {
  const cwd = tempProject();
  t.after(() => rmSync(cwd, { recursive: true, force: true }));

  const unknown = init(cwd, { demo: false, starter: 'mainframe' });
  assert.equal(unknown.code, 1);
  assert.match(unknown.lines[0] ?? '', /unknown starter "mainframe" — available starters: cli-tool, library, web-app/);

  // `veri init --starter` with no name lists what is available (WO-091).
  const bare = init(cwd, { demo: false, starter: '' });
  assert.equal(bare.code, 1);
  assert.match(bare.lines[0] ?? '', /usage: veri init --starter <name> — available starters: cli-tool, library, web-app/);

  const both = init(cwd, { demo: true, starter: 'web-app' });
  assert.equal(both.code, 1);
  assert.match(both.lines[0] ?? '', /mutually exclusive/);

  assert.ok(!existsSync(join(cwd, 'veri')), 'no rejected form may scaffold anything');
});

test('init refuses to run twice; commands refuse to run without veri/', async (t) => {
  const cwd = tempProject();
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  assert.equal((await check(cwd)).code, 1);
  init(cwd, { demo: false });
  assert.equal(init(cwd, { demo: false }).code, 1);
});

test('new rejects unknown types and missing titles', async (t) => {
  const cwd = tempProject();
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  init(cwd, { demo: false });
  assert.equal((await newDoc(cwd, 'ticket', 'X')).code, 1);
  assert.equal((await newDoc(cwd, 'requirement', undefined)).code, 1);
});

test('check on the five-issues fixture reports exactly 5 issues and exits 1', async (t) => {
  // Copied out of this repo so provenance skips deterministically (WO-044):
  // in place, the fixture would borrow this repo's git history.
  const cwd = tempProject();
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  cpSync(FIVE_ISSUES, cwd, { recursive: true });
  const result = await check(cwd);
  assert.equal(result.code, 1);
  assert.equal(result.lines.at(-1), '5 issue(s) · 14 advisories', result.lines.join('\n'));
  // The fixture predates the marker: the leading format line says so.
  assert.match(result.lines[0] ?? '', /^format 0 \(pre-marker/);
  const body = result.lines.slice(1, -1).filter((line) => !line.startsWith('(provenance:'));
  const issueLines = body.filter((line) => !line.startsWith('(advisory) '));
  const advisoryLines = body.filter((line) => line.startsWith('(advisory) '));
  assert.equal(issueLines.length, 5);
  assert.equal(advisoryLines.length, 14);
  // Advisories print after every issue (DEC-025), each one line with a file.
  assert.deepEqual(body.slice(0, 5), issueLines);
  for (const line of body) {
    assert.match(line, /^(\(advisory\) )?\S+\.md.*: /, `line should carry a file: ${line}`);
    assert.ok(!line.includes('\n'), `message must be one line: ${line}`);
  }
});

test('a project with advisories but no issues still reports ok and exits 0', async (t) => {
  const cwd = tempProject();
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  init(cwd, { demo: false });
  await newDoc(cwd, 'requirement', 'Bare');
  // Strip the template-born section: an advisory fires, but never an issue (DEC-025).
  const file = join(cwd, 'veri/requirements/REQ-001-bare.md');
  writeFileSync(file, readFileSync(file, 'utf8').replace('## Acceptance criteria', '## Something else'));
  const result = await check(cwd);
  assert.equal(result.code, 0, result.lines.join('\n'));
  assert.equal(result.lines.at(-1), 'ok — 2 documents, 0 issues · 1 advisories');
  assert.match(result.lines[1] ?? '', /^\(advisory\) requirements\/REQ-001-bare\.md: /);
});

test('migrate stamps a pre-marker project; a second run is a no-op; newer refuses', async (t) => {
  const cwd = tempProject();
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  init(cwd, { demo: false });
  const marker = join(cwd, 'veri', 'format');
  rmSync(marker); // simulate a project from before the marker existed

  const before = await check(cwd);
  assert.equal(before.code, 0, 'pre-marker must stay fully usable');
  assert.match(before.lines[0] ?? '', /^format 0 \(pre-marker/);

  const migrated = migrate(cwd);
  assert.equal(migrated.code, 0, migrated.lines.join('\n'));
  assert.match(migrated.lines.at(-1) ?? '', new RegExp(`format 0 to ${CURRENT_FORMAT}`));
  assert.equal(readFileSync(marker, 'utf8'), `${CURRENT_FORMAT}\n`);
  assert.equal((await check(cwd)).lines[0], `format ${CURRENT_FORMAT} (current)`);

  const again = migrate(cwd);
  assert.equal(again.code, 0);
  assert.match(again.lines[0] ?? '', /nothing to migrate/);

  writeFileSync(marker, '99\n');
  const newer = await check(cwd);
  assert.equal(newer.code, 1, 'a newer format must be a check issue');
  assert.match(newer.lines.join('\n'), /update Veri/);
  const refused = migrate(cwd);
  assert.equal(refused.code, 1);
  assert.match(refused.lines.join('\n'), /update Veri/);
});

test('check on this repository exits 0', async () => {
  const result = await check(REPO_ROOT);
  assert.equal(result.code, 0, result.lines.join('\n'));
});

test('checkReport is the structured source check renders from (WO-076)', async (t) => {
  const cwd = tempProject();
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  cpSync(FIVE_ISSUES, cwd, { recursive: true });
  const report = await checkReport(cwd);
  assert.ok(report !== null);
  assert.equal(report.issues.length, 5);
  assert.equal(report.advisories.length, 14);
  for (const advisory of report.advisories) {
    assert.ok(advisory.kind.length > 0 && advisory.file.endsWith('.md'), `advisory carries kind and file: ${JSON.stringify(advisory)}`);
  }
  // The renderer adds nothing of its own: every check line is derived from
  // the report the GitHub Action consumes (REQ-025 — one source of truth).
  const rendered = await check(cwd);
  assert.deepEqual(
    rendered.lines,
    [
      report.formatLine,
      ...report.issues.map((issue) => `${issue.file}: ${issue.message}`),
      ...report.advisories.map((advisory) => `(advisory) ${advisory.file}: ${advisory.message}`),
      ...report.skips,
      `${report.issues.length} issue(s) · ${report.advisories.length} advisories`,
    ],
  );
  assert.equal(await checkReport(tmpdir()), null);
});

test('context prints the exact package get_context serves (DEC-038)', async (t) => {
  const cwd = tempProject();
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  assert.equal(init(cwd, { demo: false }).code, 0);
  assert.equal((await newDoc(cwd, 'work-order', 'Ship the thing')).code, 0);

  const result = await context(cwd, 'WO-001');
  assert.equal(result.code, 0, result.lines.join('\n'));
  // Byte-identical to the shared assembly — one implementation, two channels.
  assert.equal(result.lines.join('\n'), (await assembleContext(cwd, 'WO-001')).text);
  assert.match(result.lines[0]!, /^# Context package · WO-001 — Ship the thing/);

  assert.equal((await context(cwd, undefined)).code, 1);
  const missing = await context(cwd, 'WO-999');
  assert.equal(missing.code, 1);
  assert.match(missing.lines[0]!, /no document with id WO-999/);
  const notWo = await context(cwd, 'WF-001');
  assert.equal(notWo.code, 1);
  assert.match(notWo.lines[0]!, /expects a work order id/);
});

test('list prints id, status, title sorted by id', async (t) => {
  const cwd = tempProject();
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  init(cwd, { demo: false });
  await newDoc(cwd, 'requirement', 'Zebra');
  await newDoc(cwd, 'decision', 'Aardvark');
  const all = await list(cwd, undefined);
  assert.equal(all.code, 0);
  assert.deepEqual(
    all.lines.map((line) => line.split(/\s+/)[0]),
    ['DEC-001', 'REQ-001', 'WF-001'],
  );
  assert.match(all.lines[1] ?? '', /^REQ-001\s+draft\s+Zebra$/);

  // REQ-032 (WO-114): a hypothesis requirement is marked with its declared
  // outcome; the kind-less constraint line above stays exactly as it was.
  writeFileSync(
    join(cwd, 'veri/requirements/REQ-002-bet.md'),
    '---\nid: REQ-002\ntype: requirement\ntitle: Onboarding bet\nstatus: draft\ncreated: 2026-08-01\nupdated: 2026-08-01\nkind: hypothesis\noutcome:\n  metric: activation-rate\n  target: "> 40%"\n---\nBody.\n\n## Acceptance criteria\n\n- [ ] x\n',
  );
  const withBet = await list(cwd, 'requirement');
  assert.match(
    withBet.lines.join('\n'),
    /^REQ-002\s+draft\s+Onboarding bet · hypothesis · outcome: activation-rate > 40%$/m,
  );

  const filtered = await list(cwd, 'decision');
  assert.equal(filtered.lines.length, 1);
  assert.equal((await list(cwd, 'nonsense')).code, 1);
});

const CLI_BIN = fileURLToPath(new URL('../dist/cli.js', import.meta.url));
test('the built veri bin runs check against this repo', { skip: !existsSync(CLI_BIN) }, () => {
  const run = spawnSync(process.execPath, [CLI_BIN, 'check'], { cwd: REPO_ROOT, encoding: 'utf8' });
  assert.equal(run.status, 0, run.stdout + run.stderr);
  assert.match(run.stdout, /0 issues/);
});

test('open launches the desktop shell on the resolved project directory', (t) => {
  const dir = tempProject();
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  init(dir, { demo: false });
  const launches: string[][] = [];
  const result = open(dir, undefined, {
    resolvePath: (spec) => join(REPO_ROOT, 'packages/ui', spec.replace('@verikb/ui/', '')),
    exists: (bin) => bin.startsWith(join(REPO_ROOT, 'packages/ui')),
    launch: (bin, args) => launches.push([bin, ...args]),
  });
  assert.equal(result.code, 0);
  assert.equal(launches.length, 1);
  assert.deepEqual(launches[0], [
    join(REPO_ROOT, 'packages/ui', 'src-tauri', 'target', 'release', 'bundle', 'macos', 'Veri.app', 'Contents', 'MacOS', 'veri-shell'),
    dir,
  ]);
});

test('open refuses a non-project directory and reports a missing desktop app', (t) => {
  const dir = tempProject();
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const noProject = open(dir, undefined, {
    resolvePath: () => {
      throw new Error('unreachable');
    },
    launch: () => assert.fail('must not launch'),
  });
  assert.equal(noProject.code, 1);
  assert.match(noProject.lines[0], /no veri\/ directory/);

  init(dir, { demo: false });
  const noApp = open(dir, undefined, {
    resolvePath: () => {
      throw new Error("Cannot find module '@verikb/ui/package.json'");
    },
    exists: () => false, // no installed Veri.app either
    launch: () => assert.fail('must not launch'),
  });
  assert.equal(noApp.code, 1);
  assert.match(noApp.lines[0], /cannot find the Veri desktop app/);
});

test('veri architecture prints the compiled projection, deterministically', async (t) => {
  const cwd = tempProject();
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  init(cwd, { demo: false });

  // Declare the module registry on the workflow document (DEC-059) and an
  // active decision carrying a constraint (DEC-058).
  const wf = join(cwd, 'veri/workflow.md');
  writeFileSync(
    wf,
    readFileSync(wf, 'utf8').replace(
      '---\n',
      '---\nmodules:\n  - name: core\n    path: packages/core\n    purpose: Pure domain logic\n  - name: ui\n    path: packages/ui\n    purpose: Desktop app\n',
    ),
  );
  writeFileSync(
    join(cwd, 'veri/decisions/DEC-001-boundary.md'),
    '---\nid: DEC-001\ntype: decision\ntitle: Boundary\nstatus: active\napproved: 2026-08-01\ncreated: 2026-08-01\nupdated: 2026-08-01\narchitecture:\n  constraints:\n    - from: core\n      to: ui\n      allowed: false\n---\n## Choice\n\nCore stays pure.\n',
  );

  assert.equal((await check(cwd)).code, 0);
  const first = await architecture(cwd);
  assert.equal(first.code, 0, first.lines.join('\n'));
  const text = first.lines.join('\n');
  assert.match(text, /core\s+packages\/core\s+Pure domain logic/);
  assert.match(text, /core → ui\s+forbidden\s+\(DEC-001\)/);
  assert.equal(text, (await architecture(cwd)).lines.join('\n'));

  // The typo case: an unknown module fails check, citing the decision.
  writeFileSync(
    join(cwd, 'veri/decisions/DEC-002-typo.md'),
    '---\nid: DEC-002\ntype: decision\ntitle: Typo\nstatus: proposed\ncreated: 2026-08-01\nupdated: 2026-08-01\narchitecture:\n  constraints:\n    - from: core\n      to: electorn\n      allowed: false\n---\n## Choice\n\nOops.\n',
  );
  const failed = await check(cwd);
  assert.equal(failed.code, 1);
  assert.ok(failed.lines.some((line) => line.includes('DEC-002') && line.includes('"electorn"')), failed.lines.join('\n'));
});

test('a forbidden observed import is a check advisory and an architecture violations row, never the exit code', async (t) => {
  const cwd = tempProject();
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  init(cwd, { demo: false });

  // Registry (DEC-059) with one module deliberately absent from disk, and an
  // active decision forbidding alpha → beta (DEC-058).
  const wf = join(cwd, 'veri/workflow.md');
  writeFileSync(
    wf,
    readFileSync(wf, 'utf8').replace(
      '---\n',
      '---\nmodules:\n  - name: alpha\n    path: packages/alpha\n    purpose: Foundation\n  - name: beta\n    path: packages/beta\n    purpose: Surface\n  - name: ghost\n    path: packages/ghost\n    purpose: Not on disk\n',
    ),
  );
  writeFileSync(
    join(cwd, 'veri/decisions/DEC-001-boundary.md'),
    '---\nid: DEC-001\ntype: decision\ntitle: Boundary\nstatus: active\napproved: 2026-08-01\ncreated: 2026-08-01\nupdated: 2026-08-01\narchitecture:\n  constraints:\n    - from: alpha\n      to: beta\n      allowed: false\n---\n## Choice\n\nAlpha stays pure.\n',
  );
  // The codebase violates the decision. (The specifier is harmless to this
  // repo's own dogfood scan — @t/beta resolves to nothing here.)
  mkdirSync(join(cwd, 'packages/alpha/src'), { recursive: true });
  mkdirSync(join(cwd, 'packages/beta'), { recursive: true });
  writeFileSync(join(cwd, 'packages/alpha/package.json'), JSON.stringify({ name: '@t/alpha' }));
  writeFileSync(join(cwd, 'packages/beta/package.json'), JSON.stringify({ name: '@t/beta' }));
  writeFileSync(join(cwd, 'packages/alpha/src/main.ts'), "import thing from '@t/beta';\n");

  // The violation rides the advisory tier: exit 0, zero issues (DEC-025).
  const checked = await check(cwd);
  assert.equal(checked.code, 0, checked.lines.join('\n'));
  assert.match(checked.lines.at(-1) ?? '', /0 issues/);
  assert.ok(
    checked.lines.includes(
      '(advisory) packages/alpha/src/main.ts: imports "@t/beta" — the alpha → beta edge is forbidden by DEC-001',
    ),
    checked.lines.join('\n'),
  );
  assert.ok(
    checked.lines.includes('(architecture: skipped module ghost — packages/ghost is not on disk)'),
    checked.lines.join('\n'),
  );

  const arch = await architecture(cwd);
  assert.equal(arch.code, 0);
  const text = arch.lines.join('\n');
  assert.match(text, /Violations — observed imports vs the intended architecture/);
  assert.match(text, /alpha → beta\s+packages\/alpha\/src\/main\.ts imports "@t\/beta"\s+\(forbidden by DEC-001\)/);
  assert.match(text, /\(architecture: skipped module ghost — packages\/ghost is not on disk\)/);
});

test('an observed import forbidden at severity: error is a check issue and exit 1 (DEC-062)', async (t) => {
  const cwd = tempProject();
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  init(cwd, { demo: false });

  const wf = join(cwd, 'veri/workflow.md');
  writeFileSync(
    wf,
    readFileSync(wf, 'utf8').replace(
      '---\n',
      '---\nmodules:\n  - name: alpha\n    path: packages/alpha\n    purpose: Foundation\n  - name: beta\n    path: packages/beta\n    purpose: Surface\n',
    ),
  );
  writeFileSync(
    join(cwd, 'veri/decisions/DEC-001-boundary.md'),
    '---\nid: DEC-001\ntype: decision\ntitle: Boundary\nstatus: active\napproved: 2026-08-01\ncreated: 2026-08-01\nupdated: 2026-08-01\narchitecture:\n  constraints:\n    - from: alpha\n      to: beta\n      allowed: false\n      severity: error\n---\n## Choice\n\nAlpha stays pure — hard.\n',
  );
  mkdirSync(join(cwd, 'packages/alpha/src'), { recursive: true });
  mkdirSync(join(cwd, 'packages/beta'), { recursive: true });
  writeFileSync(join(cwd, 'packages/alpha/package.json'), JSON.stringify({ name: '@t/alpha' }));
  writeFileSync(join(cwd, 'packages/beta/package.json'), JSON.stringify({ name: '@t/beta' }));
  writeFileSync(join(cwd, 'packages/alpha/src/main.ts'), "import thing from '@t/beta';\n");

  // The violation is a counted issue: exit 1 through the issue pipeline.
  const checked = await check(cwd);
  assert.equal(checked.code, 1, checked.lines.join('\n'));
  assert.match(checked.lines.at(-1) ?? '', /1 issue\(s\)/);
  assert.ok(
    checked.lines.includes(
      'packages/alpha/src/main.ts: imports "@t/beta" — the alpha → beta edge is forbidden by DEC-001 (severity: error)',
    ),
    checked.lines.join('\n'),
  );
  assert.ok(!checked.lines.some((line) => line.startsWith('(advisory)') && line.includes('@t/beta')));

  // veri architecture prints the severity and renders the violation with the issues.
  const arch = await architecture(cwd);
  assert.equal(arch.code, 0);
  const text = arch.lines.join('\n');
  assert.match(text, /alpha → beta\s+forbidden\s+error\s+\(DEC-001\)/);
  assert.match(text, /Issues — error-severity violations \(these fail veri check\)/);
  assert.match(text, /alpha → beta\s+packages\/alpha\/src\/main\.ts imports "@t\/beta"\s+\(forbidden by DEC-001\)/);
  assert.match(text, /\(none at advisory severity\)/);

  // Demoting the constraint restores WO-067's advisory posture, byte-identical.
  writeFileSync(
    join(cwd, 'veri/decisions/DEC-001-boundary.md'),
    '---\nid: DEC-001\ntype: decision\ntitle: Boundary\nstatus: active\napproved: 2026-08-01\ncreated: 2026-08-01\nupdated: 2026-08-01\narchitecture:\n  constraints:\n    - from: alpha\n      to: beta\n      allowed: false\n---\n## Choice\n\nAlpha stays pure — hard.\n',
  );
  const demoted = await check(cwd);
  assert.equal(demoted.code, 0, demoted.lines.join('\n'));
  assert.ok(
    demoted.lines.includes(
      '(advisory) packages/alpha/src/main.ts: imports "@t/beta" — the alpha → beta edge is forbidden by DEC-001',
    ),
    demoted.lines.join('\n'),
  );
});

test('veri import prints the kickoff prompt; init hints on brownfield folders (REQ-024)', async (t) => {
  const cwd = tempProject();
  t.after(() => rmSync(cwd, { recursive: true, force: true }));

  // No veri/ yet: import refuses with the standard guidance.
  assert.equal(importPrompt(cwd).code, 1);

  // A greenfield folder gets no import hint from init.
  const green = init(cwd, { demo: false });
  assert.equal(green.code, 0);
  assert.ok(!green.lines.some((line) => line.includes('veri import')), green.lines.join('\n'));

  const result = importPrompt(cwd);
  assert.equal(result.code, 0);
  assert.match(result.lines.join('\n'), /get_import_instructions/);

  // A folder with existing code gets the hint.
  const brown = tempProject();
  t.after(() => rmSync(brown, { recursive: true, force: true }));
  writeFileSync(join(brown, 'main.ts'), 'export {};\n');
  const hinted = init(brown, { demo: false });
  assert.equal(hinted.code, 0);
  assert.ok(hinted.lines.some((line) => line.includes('Run "veri import"')), hinted.lines.join('\n'));
});

// --- Team semantics: collisions, renumber, maintainer approvals (WO-077) ---

test('a merge collision fails check with the resolution path, and veri renumber resolves it', async (t) => {
  const cwd = tempProject();
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  assert.equal(init(cwd, { demo: false }).code, 0);
  await newDoc(cwd, 'decision', 'Ours');
  // The other branch's allocation of the same id, arriving via merge.
  const ours = readFileSync(join(cwd, 'veri/decisions/DEC-001-ours.md'), 'utf8');
  writeFileSync(join(cwd, 'veri/decisions/DEC-001-theirs.md'), ours.replace('title: "Ours"', 'title: "Theirs"'));

  const failed = await check(cwd);
  assert.equal(failed.code, 1);
  const report = failed.lines.join('\n');
  // The error names both claimants and its own fix (REQ-026, DEC-070).
  assert.match(report, /decisions\/DEC-001-ours\.md, decisions\/DEC-001-theirs\.md: duplicate id DEC-001/);
  assert.match(report, /veri renumber DEC-001 --file/);

  const resolved = await renumber(cwd, 'DEC-001', { file: 'veri/decisions/DEC-001-theirs.md' });
  assert.equal(resolved.code, 0, resolved.lines.join('\n'));
  assert.equal(resolved.lines[0], 'DEC-001 → DEC-002 (veri/decisions/DEC-001-theirs.md → veri/decisions/DEC-002-theirs.md)');
  assert.match(readFileSync(join(cwd, 'veri/decisions/DEC-002-theirs.md'), 'utf8'), /^id: DEC-002$/m);

  const clean = await check(cwd);
  assert.equal(clean.code, 0, clean.lines.join('\n'));
});

test('veri approve --as stamps the maintainer and refuses names off the roster', async (t) => {
  const cwd = tempProject();
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  assert.equal(init(cwd, { demo: false }).code, 0);
  const wf = join(cwd, 'veri/workflow.md');
  writeFileSync(wf, readFileSync(wf, 'utf8').replace(/^status: /m, 'maintainers:\n  - Ada\n  - Grace\nstatus: '));
  await newDoc(cwd, 'decision', 'Team choice');

  const unlisted = await approve(cwd, 'DEC-001', 'Mallory');
  assert.equal(unlisted.code, 1);
  assert.match(unlisted.lines.join('\n'), /"Mallory" is not in the workflow's maintainers list \(Ada, Grace\)/);

  const stamped = await approve(cwd, 'DEC-001', 'Grace');
  assert.equal(stamped.code, 0, stamped.lines.join('\n'));
  assert.match(stamped.lines[0], /DEC-001 proposed → active — approved: \d{4}-\d{2}-\d{2} by Grace/);
  assert.match(readFileSync(join(cwd, 'veri/decisions/DEC-001-team-choice.md'), 'utf8'), /^approved_by: Grace$/m);
});

test('veri approve defaults --as from git user.name when it matches a listed maintainer (DEC-071)', async (t) => {
  const cwd = tempProject();
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  assert.equal(init(cwd, { demo: false }).code, 0);
  const wf = join(cwd, 'veri/workflow.md');
  writeFileSync(wf, readFileSync(wf, 'utf8').replace(/^status: /m, 'maintainers:\n  - Ada\nstatus: '));
  await newDoc(cwd, 'decision', 'Team choice');

  // The host identity comes from git config; pin it for the test.
  const gitConfig = join(cwd, 'test-gitconfig');
  writeFileSync(gitConfig, '[user]\n\tname = Ada\n');
  const saved = process.env['GIT_CONFIG_GLOBAL'];
  process.env['GIT_CONFIG_GLOBAL'] = gitConfig;
  t.after(() => {
    if (saved === undefined) delete process.env['GIT_CONFIG_GLOBAL'];
    else process.env['GIT_CONFIG_GLOBAL'] = saved;
  });

  const stamped = await approve(cwd, 'DEC-001');
  assert.equal(stamped.code, 0, stamped.lines.join('\n'));
  assert.match(stamped.lines[0], / by Ada /);

  // An identity off the roster never silently stamps — the CLI asks for --as.
  writeFileSync(gitConfig, '[user]\n\tname = Mallory\n');
  await newDoc(cwd, 'decision', 'Another choice');
  const refused = await approve(cwd, 'DEC-002');
  assert.equal(refused.code, 1);
  assert.match(refused.lines.join('\n'), /--as <name>/);
});

test('binding drift skips with a note outside git, while bound-test facts still check (WO-088)', async (t) => {
  const cwd = tempProject();
  t.after(() => rmSync(cwd, { recursive: true, force: true }));

  init(cwd, { demo: false });
  await newDoc(cwd, 'requirement', 'Exports work');
  await approve(cwd, 'REQ-001');
  await newDoc(cwd, 'work-order', 'Export pipeline');
  const file = join(cwd, 'veri/work-orders/WO-001-export-pipeline.md');
  const raw = readFileSync(file, 'utf8')
    .replace('status: backlog', 'status: in-progress\nclaimed_by: session-a\nclaimed_at: 2026-08-01')
    .replace(
      /^---\n$/m,
      'links:\n  - id: REQ-001\n    rel: implements\nbinds:\n  paths:\n    - src/export/**\n  tests:\n    - tests/gone.test.ts\n---\n',
    );
  writeFileSync(file, raw);

  const report = await checkReport(cwd);
  assert.ok(report !== null);
  assert.equal(report.issues.length, 0, report.issues.map((i) => i.message).join('\n'));
  // No repository: the git-backed binding detectors say so instead of guessing.
  assert.ok(
    report.skips.some((s) => s.startsWith('(binding drift: skipped')),
    report.skips.join('\n'),
  );
  // The test-existence check needs only the filesystem — it still runs.
  const missing = report.advisories.filter((a) => a.kind === 'drift-missing-test');
  assert.equal(missing.length, 1);
  assert.match(missing[0].message, /tests\/gone\.test\.ts/);
});

test('veri import <file> files a source with the original preserved, and check passes (WO-094)', async (t) => {
  const cwd = tempProject();
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  assert.equal(init(cwd, { demo: false }).code, 0);

  writeFileSync(join(cwd, 'meridian-onboarding-interview.md'), '# Meridian onboarding interview\n\nTranscript body.\n');
  const imported = await importFile(cwd, 'meridian-onboarding-interview.md');
  assert.equal(imported.code, 0, imported.lines.join('\n'));
  assert.match(imported.lines[0], /Imported meridian-onboarding-interview\.md → veri\/sources\/SRC-001-meridian-onboarding-interview\.md \(SRC-001\)/);

  const doc = readFileSync(join(cwd, 'veri/sources/SRC-001-meridian-onboarding-interview.md'), 'utf8');
  assert.match(doc, /^title: "Meridian onboarding interview"$/m);
  assert.match(doc, /^status: imported$/m);
  assert.match(doc, /^original: "originals\/SRC-001-meridian-onboarding-interview\.md"$/m);
  assert.match(doc, /Transcript body\./);
  const original = readFileSync(join(cwd, 'veri/originals/SRC-001-meridian-onboarding-interview.md'), 'utf8');
  assert.match(original, /^# Meridian onboarding interview$/m);

  // The preserved .md original must never parse as a document (DEC-094):
  // exactly WF-001 + SRC-001, zero issues.
  const checked = await check(cwd);
  assert.equal(checked.code, 0, checked.lines.join('\n'));
  assert.match(checked.lines.at(-1) ?? '', /ok — 2 documents, 0 issues/);
});

test('veri import refuses unsupported and unreadable files without filing anything', async (t) => {
  const cwd = tempProject();
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  assert.equal(init(cwd, { demo: false }).code, 0);

  writeFileSync(join(cwd, 'scan.pdf'), Buffer.from([0x25, 0x50, 0x44, 0x46]));
  const refused = await importFile(cwd, 'scan.pdf');
  assert.equal(refused.code, 1);
  assert.match(refused.lines[0], /supported formats: \.md \.txt \.eml/);

  const missing = await importFile(cwd, 'no-such-file.txt');
  assert.equal(missing.code, 1);
  assert.match(missing.lines[0], /cannot read no-such-file\.txt/);

  const filed = readdirSync(join(cwd, 'veri/sources')).filter((f) => f.endsWith('.md'));
  assert.equal(filed.length, 0, 'nothing may be filed on refusal');
  assert.ok(!existsSync(join(cwd, 'veri/originals')), 'no originals dir on refusal');
});

test('veri import allocates past existing sources and records the issued id', async (t) => {
  const cwd = tempProject();
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  assert.equal(init(cwd, { demo: false }).code, 0);
  assert.equal((await newDoc(cwd, 'source', 'Hand-authored evidence')).code, 0);

  writeFileSync(join(cwd, 'pricing-thread.eml'), ['From: ops@example.com', 'Subject: Renewal pricing', '', 'Body.'].join('\r\n'));
  const imported = await importFile(cwd, 'pricing-thread.eml');
  assert.equal(imported.code, 0, imported.lines.join('\n'));
  assert.match(imported.lines[0], /\(SRC-002\)/);
  const doc = readFileSync(join(cwd, 'veri/sources/SRC-002-renewal-pricing.md'), 'utf8');
  assert.match(doc, /^title: "Renewal pricing"$/m);
  assert.match(doc, /- Subject: Renewal pricing/);
});

test('veri withdraw takes a document out of play and veri check stays clean', async (t) => {
  const cwd = tempProject();
  t.after(() => rmSync(cwd, { recursive: true, force: true }));

  init(cwd, { demo: false });
  await newDoc(cwd, 'decision', 'Pick a widget');

  const result = await withdraw(cwd, 'dec-001');
  assert.equal(result.code, 0, result.lines.join('\n'));
  assert.match(result.lines[0] ?? '', /^DEC-001 proposed → withdrawn/);
  assert.match(result.lines[1] ?? '', /inbound \[\[links\]\] keep resolving/);
  assert.match(readFileSync(join(cwd, 'veri/decisions/DEC-001-pick-a-widget.md'), 'utf8'), /^status: withdrawn$/m);

  const checked = await check(cwd);
  assert.equal(checked.code, 0, checked.lines.join('\n'));
});

test('veri withdraw without an id prints usage and exits 1', async (t) => {
  const cwd = tempProject();
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  init(cwd, { demo: false });
  const result = await withdraw(cwd, undefined);
  assert.equal(result.code, 1);
  assert.match(result.lines[0] ?? '', /^usage: veri withdraw <id>/);
});

test('veri supersede retires an active decision once its successor is approved (WO-138)', async (t) => {
  const cwd = tempProject();
  t.after(() => rmSync(cwd, { recursive: true, force: true }));

  init(cwd, { demo: false });
  await newDoc(cwd, 'decision', 'The old road');
  await newDoc(cwd, 'decision', 'The new road');
  const old = join(cwd, 'veri/decisions/DEC-001-the-old-road.md');

  // Both still proposed: nothing may be retired on an unapproved successor.
  const early = await supersede(cwd, 'DEC-001', 'DEC-002');
  assert.equal(early.code, 1);
  assert.match(early.lines[0] ?? '', /DEC-001 is not active/);

  await approve(cwd, 'DEC-001', 'Tester');
  const unapprovedSuccessor = await supersede(cwd, 'DEC-001', 'DEC-002');
  assert.equal(unapprovedSuccessor.code, 1);
  assert.match(unapprovedSuccessor.lines[0] ?? '', /DEC-002 is proposed, not active — approve it first/);
  assert.match(readFileSync(old, 'utf8'), /^status: active$/m);

  await approve(cwd, 'DEC-002', 'Tester');
  const result = await supersede(cwd, 'dec-001', 'dec-002');
  assert.equal(result.code, 0, result.lines.join('\n'));
  assert.match(result.lines[0] ?? '', /^DEC-001 active → superseded by DEC-002/);
  const content = readFileSync(old, 'utf8');
  assert.match(content, /^status: superseded$/m);
  assert.match(content, /^superseded_by: DEC-002$/m);

  const checked = await check(cwd);
  assert.equal(checked.code, 0, checked.lines.join('\n'));
});

test('veri supersede without both ids prints usage and exits 1 (WO-138)', async (t) => {
  const cwd = tempProject();
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  init(cwd, { demo: false });
  for (const args of [[undefined, undefined], ['DEC-001', undefined], [undefined, 'DEC-002']] as const) {
    const result = await supersede(cwd, args[0], args[1]);
    assert.equal(result.code, 1);
    assert.match(result.lines[0] ?? '', /^usage: veri supersede <DEC-id> --by <DEC-id>/);
  }
});

test('veri delete removes an unapproved, unreferenced document and keeps its id spent', async (t) => {
  const cwd = tempProject();
  t.after(() => rmSync(cwd, { recursive: true, force: true }));

  init(cwd, { demo: false });
  await newDoc(cwd, 'decision', 'Pick a widget');
  const file = join(cwd, 'veri/decisions/DEC-001-pick-a-widget.md');

  const result = await del(cwd, 'DEC-001');
  assert.equal(result.code, 0, result.lines.join('\n'));
  assert.match(result.lines[0] ?? '', /^deleted DEC-001/);
  assert.equal(existsSync(file), false);

  // The floor holds (DEC-037): the next decision is DEC-002, not the hole.
  await newDoc(cwd, 'decision', 'Pick another widget');
  assert.ok(existsSync(join(cwd, 'veri/decisions/DEC-002-pick-another-widget.md')));
});

test('veri delete refuses the approved and the referenced, exits 1, and names the way out', async (t) => {
  const cwd = tempProject();
  t.after(() => rmSync(cwd, { recursive: true, force: true }));

  init(cwd, { demo: false });
  await newDoc(cwd, 'requirement', 'User authentication');
  await approve(cwd, 'REQ-001');

  const approved = await del(cwd, 'REQ-001');
  assert.equal(approved.code, 1);
  assert.match(approved.lines.join(' '), /was approved .* veri withdraw REQ-001/);
  assert.ok(existsSync(join(cwd, 'veri/requirements/REQ-001-user-authentication.md')));

  // The other refusal, on an unapproved document: a referrer would be stranded.
  await newDoc(cwd, 'requirement', 'Session expiry');
  await newDoc(cwd, 'decision', 'Pick a widget');
  const decision = join(cwd, 'veri/decisions/DEC-001-pick-a-widget.md');
  writeFileSync(decision, `${readFileSync(decision, 'utf8')}\nGoverns [[REQ-002]].\n`);

  const stranding = await del(cwd, 'REQ-002');
  assert.equal(stranding.code, 1);
  assert.match(stranding.lines.join(' '), /DEC-001 references REQ-002 — deleting it would strand that link/);
  assert.match(stranding.lines.join(' '), /veri withdraw REQ-002/);
  assert.ok(existsSync(join(cwd, 'veri/requirements/REQ-002-session-expiry.md')));
});

test('a withdrawn document leaves the context package while its neighbors stay', async (t) => {
  const cwd = tempProject();
  t.after(() => rmSync(cwd, { recursive: true, force: true }));

  init(cwd, { demo: false });
  await newDoc(cwd, 'requirement', 'User authentication');
  await newDoc(cwd, 'decision', 'Pick a widget');
  await newDoc(cwd, 'work-order', 'Ship the thing');

  // The work order links both; the decision is what gets withdrawn.
  const wo = join(cwd, 'veri/work-orders/WO-001-ship-the-thing.md');
  writeFileSync(
    wo,
    readFileSync(wo, 'utf8').replace(
      /^updated: (.*)$/m,
      'updated: $1\nlinks:\n  - id: REQ-001\n    rel: implements\n  - id: DEC-001\n    rel: constrained-by',
    ),
  );
  assert.match((await context(cwd, 'WO-001')).lines.join('\n'), /DEC-001/);

  assert.equal((await withdraw(cwd, 'DEC-001')).code, 0);
  const after = (await context(cwd, 'WO-001')).lines.join('\n');
  assert.doesNotMatch(after, /### DEC-001/);
  assert.match(after, /### REQ-001/);
});

// --- The combined file-and-approve act (WO-142, DEC-147) ---

test('veri new requirement --approve creates an accepted, stamped document in one command and check passes (WO-142)', async (t) => {
  const cwd = tempProject();
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  assert.equal(init(cwd, { demo: false }).code, 0);

  const created = await newDoc(cwd, 'requirement', 'User authentication', { approve: true });
  assert.equal(created.code, 0, created.lines.join('\n'));
  assert.match(created.lines[0], /Created veri\/requirements\/REQ-001-user-authentication\.md \(REQ-001\) — draft → accepted, approved: \d{4}-\d{2}-\d{2}/);
  // The lifecycle-subject hint: id plus "approved", the drift-anchor convention (WO-045).
  assert.match(created.lines[1], /git commit -m "REQ-001: filed and approved"/);

  const content = readFileSync(join(cwd, 'veri/requirements/REQ-001-user-authentication.md'), 'utf8');
  assert.match(content, /^status: accepted$/m);
  assert.match(content, /^approved: \d{4}-\d{2}-\d{2}$/m);

  const checked = await check(cwd);
  assert.equal(checked.code, 0, checked.lines.join('\n'));
});

test('the combined path refuses what veri approve refuses, filing nothing (WO-142)', async (t) => {
  const cwd = tempProject();
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  assert.equal(init(cwd, { demo: false }).code, 0);

  // A work order with no requirement trace: approve's dispatch gate, verbatim.
  const noTrace = await newDoc(cwd, 'work-order', 'Ship the thing', { approve: true });
  assert.equal(noTrace.code, 1);
  assert.match(noTrace.lines.join('\n'), /refusing to ready WO-001 — it links no requirement/);
  assert.ok(!existsSync(join(cwd, 'veri/work-orders/WO-001-ship-the-thing.md')), 'refusal files nothing');

  // An unlisted approver in a maintainers project: approve's DEC-071 gate.
  const wf = join(cwd, 'veri/workflow.md');
  writeFileSync(wf, readFileSync(wf, 'utf8').replace(/^status: /m, 'maintainers:\n  - Ada\nstatus: '));
  const unnamed = await newDoc(cwd, 'requirement', 'Team stamped', { approve: true });
  assert.equal(unnamed.code, 1);
  assert.match(unnamed.lines.join('\n'), /declares maintainers — the stamp must name one/);
  const unlisted = await newDoc(cwd, 'requirement', 'Team stamped', { approve: true, as: 'Mallory' });
  assert.equal(unlisted.code, 1);
  assert.match(unlisted.lines.join('\n'), /"Mallory" is not in the workflow's maintainers list/);
  assert.equal(readdirSync(join(cwd, 'veri/requirements')).filter((f) => f.endsWith('.md')).length, 0, 'refusals file nothing');

  // A listed approver lands the stamp with approved_by, as veri approve would.
  const listed = await newDoc(cwd, 'requirement', 'Team stamped', { approve: true, as: 'Ada' });
  assert.equal(listed.code, 0, listed.lines.join('\n'));
  assert.match(listed.lines[0], / by Ada/);
  const content = readFileSync(join(cwd, 'veri/requirements/REQ-001-team-stamped.md'), 'utf8');
  assert.match(content, /^approved_by: Ada$/m);
});

test('sources under --approve are filed with a notice, never stamped (WO-142, DEC-147)', async (t) => {
  const cwd = tempProject();
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  assert.equal(init(cwd, { demo: false }).code, 0);

  const filed = await newDoc(cwd, 'source', 'Hand-authored evidence', { approve: true });
  assert.equal(filed.code, 0, filed.lines.join('\n'));
  assert.match(filed.lines[1], /SRC-001 is a source — born imported and already in play; nothing needed approving\./);

  writeFileSync(join(cwd, 'notes.md'), '# Notes\n\nEvidence body.\n');
  const imported = await importFile(cwd, 'notes.md', { approve: true });
  assert.equal(imported.code, 0, imported.lines.join('\n'));
  assert.match(imported.lines.at(-1) ?? '', /SRC-002 is a source — born imported and already in play; nothing needed approving\./);

  for (const file of readdirSync(join(cwd, 'veri/sources'))) {
    assert.doesNotMatch(readFileSync(join(cwd, 'veri/sources', file), 'utf8'), /^approved:/m, `${file} must carry no stamp`);
  }
});
