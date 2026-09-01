import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appendFileSync, cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { approveDocument } from './approve.ts';
import { dispatchWorkOrder } from './dispatch.ts';
import { deleteDocument, deleteRefusal, withdrawDocument } from './discard.ts';
import { loadProject } from './load.ts';
import { checkProject } from './check.ts';
import { nextDispatchable } from './next.ts';
import { nextIdNumber, recordIssuedId } from './idstore.ts';

const FIXTURE = fileURLToPath(new URL('../fixtures/approve', import.meta.url));

function sandbox(t: { after(fn: () => void): void }): string {
  const dir = mkdtempSync(join(tmpdir(), 'veri-discard-test-'));
  cpSync(FIXTURE, dir, { recursive: true });
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

/** The fixture's one always-broken document, excluded when a test asserts a
    clean corpus — the same carve-out the approve and start suites use. */
const BROKEN = 'requirements/REQ-002-broken-draft.md';

function cleanIssues(load: Awaited<ReturnType<typeof loadProject>>): unknown[] {
  return checkProject(load).issues.filter((issue) => !('file' in issue) || issue.file !== BROKEN);
}

test('withdraw rewrites only status and updated, leaving the rest byte-for-byte', async (t) => {
  const dir = sandbox(t);
  const file = 'decisions/DEC-001-clean-proposal.md';
  const before = readFileSync(join(dir, file), 'utf8');

  const result = await withdrawDocument(dir, 'dec-001', '2026-08-26');
  assert.deepEqual(result, { id: 'DEC-001', file, from: 'proposed' });

  const after = readFileSync(join(dir, file), 'utf8');
  assert.match(after, /^status: withdrawn$/m);
  assert.match(after, /^updated: 2026-08-26$/m);
  const strip = (s: string): string => s.replace(/^(status|updated): .*\n/gm, '');
  assert.equal(strip(after), strip(before));
});

test('every type withdraws from its own lifecycle, and none of them needs an approved stamp', async (t) => {
  const dir = sandbox(t);
  for (const [id, from] of [
    ['REQ-001', 'draft'],
    ['DEC-001', 'proposed'],
    ['WO-001', 'backlog'],
    ['SRC-001', 'imported'],
  ] as const) {
    const result = await withdrawDocument(dir, id, '2026-08-26');
    assert.equal(result.from, from);
    const raw = readFileSync(join(dir, result.file), 'utf8');
    assert.match(raw, /^status: withdrawn$/m);
    assert.doesNotMatch(raw, /^approved:/m);
  }
  const load = await loadProject(dir);
  assert.deepEqual(cleanIssues(load), []);
});

test('withdraw refuses the workflow document, a second withdrawal, and an unknown id', async (t) => {
  const dir = sandbox(t);
  await assert.rejects(() => withdrawDocument(dir, 'WF-001'), /is a workflow/);
  await withdrawDocument(dir, 'DEC-001', '2026-08-26');
  await assert.rejects(() => withdrawDocument(dir, 'DEC-001'), /already withdrawn/);
  await assert.rejects(() => withdrawDocument(dir, 'REQ-404'), /no document with id REQ-404/);
});

test('a withdrawn requirement neither gates a started work order nor reaches its package', async (t) => {
  const dir = sandbox(t);
  await approveDocument(dir, 'REQ-001', '2026-08-10');
  await dispatchWorkOrder(dir, 'WO-001', 'test', { date: '2026-08-10' });
  await withdrawDocument(dir, 'REQ-001', '2026-08-26');

  const load = await loadProject(dir);
  // The work order links a withdrawn requirement: not pending, so not gated.
  assert.deepEqual(
    checkProject(load).issues.filter((issue) => issue.kind === 'gated-wo'),
    [],
  );
});

test('an inline [[ID]] pointing at a withdrawn document is still a resolving link', async (t) => {
  const dir = sandbox(t);
  appendFileSync(join(dir, 'decisions/DEC-001-clean-proposal.md'), '\nSee [[SRC-001]] for the evidence.\n');
  await withdrawDocument(dir, 'SRC-001', '2026-08-26');

  const load = await loadProject(dir);
  assert.deepEqual(
    checkProject(load).issues.filter((issue) => issue.kind === 'broken-link' && issue.file !== BROKEN),
    [],
  );
});

test('a withdrawn work order never reaches the judgment queue, stamp or no stamp', async (t) => {
  const dir = sandbox(t);
  await approveDocument(dir, 'REQ-001', '2026-08-10');
  assert.equal(nextDispatchable((await loadProject(dir)).documents)?.id, 'WO-001');

  // The transitional stamped-backlog shape (DEC-143): withdraw takes it out
  // of the queue while the stamp stays on the file as history.
  const woPath = join(dir, 'work-orders/WO-001-not-approvable.md');
  writeFileSync(woPath, readFileSync(woPath, 'utf8').replace(/^status: backlog$/m, 'status: backlog\napproved: 2026-08-10'));
  await withdrawDocument(dir, 'WO-001', '2026-08-26');
  const load = await loadProject(dir);
  assert.equal(nextDispatchable(load.documents), undefined);
  assert.match(readFileSync(woPath, 'utf8'), /^approved: 2026-08-10$/m);
});

test('delete removes an unapproved, unreferenced document and never frees its id', async (t) => {
  const dir = sandbox(t);
  recordIssuedId(dir, 'DEC', 1);
  const result = await deleteDocument(dir, 'dec-001');
  assert.deepEqual(result, { id: 'DEC-001', file: 'decisions/DEC-001-clean-proposal.md' });
  assert.equal(existsSync(join(dir, result.file)), false);

  const load = await loadProject(dir);
  assert.equal(
    load.documents.find((doc) => doc.id === 'DEC-001'),
    undefined,
  );
  // DEC-037's floor: the next id is 2, not the hole the delete just made.
  assert.equal(
    nextIdNumber(
      dir,
      'DEC',
      load.documents.map((doc) => doc.id),
    ),
    2,
  );
  assert.deepEqual(cleanIssues(load), []);
});

test('delete refuses an approved document and points at withdraw instead', async (t) => {
  const dir = sandbox(t);
  await approveDocument(dir, 'DEC-001', '2026-08-10');
  await assert.rejects(
    () => deleteDocument(dir, 'DEC-001'),
    /was approved 2026-08-10 .* Withdraw it instead: veri withdraw DEC-001/s,
  );
  assert.equal(existsSync(join(dir, 'decisions/DEC-001-clean-proposal.md')), true);
});

test('delete refuses a referenced document, naming the referrer — frontmatter link or inline ref alone', async (t) => {
  const dir = sandbox(t);
  // WO-001 links REQ-001 in frontmatter.
  await assert.rejects(() => deleteDocument(dir, 'REQ-001'), /WO-001 references REQ-001 — deleting it would strand that link/);

  // SRC-001 is linked by nobody; an inline mention alone is enough to refuse.
  const { documents } = await loadProject(dir);
  const source = documents.find((doc) => doc.id === 'SRC-001')!;
  assert.equal(deleteRefusal(source, documents), null);
  appendFileSync(join(dir, 'decisions/DEC-001-clean-proposal.md'), '\nEvidence: [[SRC-001]].\n');
  await assert.rejects(() => deleteDocument(dir, 'SRC-001'), /DEC-001 references SRC-001/);
  assert.equal(existsSync(join(dir, 'sources/SRC-001-unapprovable-type.md')), true);
});

test('deleteRefusal reports every referrer, in id order, and pluralizes with them', async (t) => {
  const dir = sandbox(t);
  appendFileSync(join(dir, 'sources/SRC-001-unapprovable-type.md'), '\nRelated: [[REQ-001]].\n');
  const { documents } = await loadProject(dir);
  const requirement = documents.find((doc) => doc.id === 'REQ-001')!;
  const refusal = deleteRefusal(requirement, documents);
  assert.match(refusal ?? '', /^SRC-001, WO-001 reference REQ-001/);
});
