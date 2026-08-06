import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { check, init, list, newDoc } from './commands.ts';

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

test('init --demo errors politely until WO-004', (t) => {
  const cwd = tempProject();
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const result = init(cwd, { demo: true });
  assert.equal(result.code, 1);
  assert.match(result.lines.join(' '), /WO-004/);
  assert.ok(!existsSync(join(cwd, 'veri')), 'must not scaffold on --demo');
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
