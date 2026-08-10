import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { approve, check, init, list, newDoc } from './commands.ts';

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
  assert.match(checked.lines[0] ?? '', /ok — 1 documents, 0 issues/);
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

  const again = await approve(cwd, 'DEC-001');
  assert.equal(again.code, 1);
  assert.match(again.lines[0] ?? '', /nothing to approve/);
  assert.equal((await approve(cwd, undefined)).code, 1);
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
  assert.equal(listed.lines.length, 16, listed.lines.join('\n'));
  assert.match(listed.lines.join('\n'), /WO-002 {3}in-progress {2}PDF export pipeline/);

  const checked = await check(cwd);
  assert.equal(checked.code, 1);
  assert.equal(checked.lines.at(-1), '2 issue(s)', checked.lines.join('\n'));
  const issues = checked.lines.slice(0, -1).join('\n');
  assert.match(issues, /WO-004/, 'WO-004 must be flagged for its missing requirement');
  assert.match(issues, /SRC-003/, 'REQ-004 must be flagged for its broken SRC-003 link');
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

test('check on the five-issues fixture reports exactly 5 issues and exits 1', async () => {
  const result = await check(FIVE_ISSUES);
  assert.equal(result.code, 1);
  assert.equal(result.lines.at(-1), '5 issue(s)', result.lines.join('\n'));
  assert.equal(result.lines.length, 6);
  for (const line of result.lines.slice(0, -1)) {
    assert.match(line, /^\S+\.md.*: /, `issue line should start with a file: ${line}`);
    assert.ok(!line.includes('\n'), `issue message must be one line: ${line}`);
  }
});

test('check on this repository exits 0', async () => {
  const result = await check(REPO_ROOT);
  assert.equal(result.code, 0, result.lines.join('\n'));
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
    ['DEC-001', 'REQ-001'],
  );
  assert.match(all.lines[1] ?? '', /^REQ-001\s+draft\s+Zebra$/);
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
