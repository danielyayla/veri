import { test } from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { renumberDocument } from './renumber.ts';
import { loadProject } from './load.ts';
import { checkProject } from './check.ts';
import { readIdRecord } from './idstore.ts';

const DOC = (id: string, type: string, status: string, extra: string, body: string): string =>
  `---\nid: ${id}\ntype: ${type}\ntitle: T ${id}\nstatus: ${status}\ncreated: 2026-08-24\nupdated: 2026-08-24\n${extra}---\n${body}`;

/** A small check-clean project: DEC-001 superseded by DEC-002, which WO-001
    links and cites inline — every reference shape the rewrite must cover. */
function sandbox(t: TestContext): string {
  const dir = mkdtempSync(join(tmpdir(), 'veri-renumber-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  for (const sub of ['requirements', 'decisions', 'work-orders', 'sources']) mkdirSync(join(dir, sub));
  writeFileSync(
    join(dir, 'requirements', 'REQ-001-req.md'),
    DOC('REQ-001', 'requirement', 'accepted', 'approved: 2026-08-24\n', '## Acceptance criteria\n\n- [ ] x\n'),
  );
  writeFileSync(
    join(dir, 'decisions', 'DEC-001-old.md'),
    DOC('DEC-001', 'decision', 'superseded', 'approved: 2026-08-24\nsuperseded_by: DEC-002\n', 'Old choice.\n'),
  );
  writeFileSync(
    join(dir, 'decisions', 'DEC-002-current.md'),
    DOC('DEC-002', 'decision', 'active', 'approved: 2026-08-24\n', 'Current choice.\n'),
  );
  writeFileSync(
    join(dir, 'work-orders', 'WO-001-work.md'),
    DOC(
      'WO-001',
      'work-order',
      'in-progress',
      'claimed_by: session-a\nclaimed_at: 2026-08-24\nlinks:\n  - id: REQ-001\n    rel: implements\n  - id: DEC-002\n    rel: constrained-by\n',
      '## Summary\n\nPer [[DEC-002]].\n\n## Receipts\n\n(none yet)\n',
    ),
  );
  return dir;
}

test('renumbering a uniquely-held id rewrites the id line, filename, and every inbound reference', async (t) => {
  const dir = sandbox(t);
  const result = await renumberDocument(dir, 'dec-002');

  assert.deepEqual(result, {
    from: 'DEC-002',
    to: 'DEC-003',
    file: 'decisions/DEC-002-current.md',
    renamedTo: 'decisions/DEC-003-current.md',
    contested: false,
    rewrittenFiles: ['decisions/DEC-001-old.md', 'work-orders/WO-001-work.md'],
    remainingRefs: [],
  });
  assert.ok(!existsSync(join(dir, 'decisions', 'DEC-002-current.md')));
  assert.match(readFileSync(join(dir, 'decisions', 'DEC-003-current.md'), 'utf8'), /^id: DEC-003$/m);
  assert.match(readFileSync(join(dir, 'decisions', 'DEC-001-old.md'), 'utf8'), /^superseded_by: DEC-003$/m);
  const wo = readFileSync(join(dir, 'work-orders', 'WO-001-work.md'), 'utf8');
  assert.match(wo, /^ {2}- id: DEC-003$/m);
  assert.match(wo, /\[\[DEC-003\]\]/);
  assert.doesNotMatch(wo, /DEC-002/);

  // No dangling references: the project is exactly as check-clean as before.
  assert.deepEqual(checkProject(await loadProject(dir)).issues, []);
  // Neither number is ever reissued (DEC-037): the floor now covers the new id.
  assert.equal(readIdRecord(dir).DEC, 3);
});

test('renumber validates the target id: taken, same, or cross-type all refuse', async (t) => {
  const dir = sandbox(t);
  await assert.rejects(() => renumberDocument(dir, 'DEC-002', { to: 'DEC-001' }), /DEC-001 is already taken/);
  await assert.rejects(() => renumberDocument(dir, 'DEC-002', { to: 'DEC-002' }), /not a renumber/);
  await assert.rejects(() => renumberDocument(dir, 'DEC-002', { to: 'WO-009' }), /cannot renumber across types/);
  await assert.rejects(() => renumberDocument(dir, 'DEC-999'), /no document with id DEC-999/);
  await assert.rejects(() => renumberDocument(dir, 'DEC-002', { refs: ['work-orders/WO-001-work.md'] }), /--refs applies only to contested ids/);
});

test('a contested id requires --file, moves only that claimant, and never rewrites references by guessing', async (t) => {
  const dir = sandbox(t);
  // The merge-collision case: a second branch also allocated DEC-002.
  writeFileSync(
    join(dir, 'decisions', 'DEC-002-rival.md'),
    DOC('DEC-002', 'decision', 'active', 'approved: 2026-08-24\n', 'Rival choice.\n'),
  );
  assert.equal(checkProject(await loadProject(dir)).issues[0]?.kind, 'duplicate-id');

  await assert.rejects(() => renumberDocument(dir, 'DEC-002'), /claimed by 2 documents.*--file/s);
  await assert.rejects(() => renumberDocument(dir, 'DEC-002', { file: 'decisions/nope.md' }), /does not hold DEC-002/);

  const result = await renumberDocument(dir, 'DEC-002', { file: 'veri/decisions/DEC-002-rival.md' });
  assert.equal(result.to, 'DEC-003');
  assert.equal(result.renamedTo, 'decisions/DEC-003-rival.md');
  assert.equal(result.contested, true);
  // References were NOT rewritten: they keep resolving to the remaining
  // claimant, and each one is listed for the resolver's review.
  assert.deepEqual(result.rewrittenFiles, []);
  // WO-001 references DEC-002 twice — the frontmatter link and the inline
  // [[ref]] — and each occurrence is listed on its own line.
  assert.deepEqual(
    result.remainingRefs.map((ref) => ref.file).sort(),
    ['decisions/DEC-001-old.md', 'work-orders/WO-001-work.md', 'work-orders/WO-001-work.md'],
  );
  for (const ref of result.remainingRefs) {
    assert.equal(typeof ref.line, 'number');
    assert.match(ref.text, /DEC-002/);
  }
  // The collision is resolved and nothing dangles.
  assert.deepEqual(checkProject(await loadProject(dir)).issues, []);
});

test('--refs follows explicitly named files to the new id in the contested case', async (t) => {
  const dir = sandbox(t);
  writeFileSync(
    join(dir, 'decisions', 'DEC-002-rival.md'),
    DOC('DEC-002', 'decision', 'active', 'approved: 2026-08-24\n', 'Rival choice.\n'),
  );
  const result = await renumberDocument(dir, 'DEC-002', {
    file: 'decisions/DEC-002-rival.md',
    refs: ['work-orders/WO-001-work.md'],
  });
  assert.deepEqual(result.rewrittenFiles, ['work-orders/WO-001-work.md']);
  assert.deepEqual(result.remainingRefs.map((ref) => ref.file), ['decisions/DEC-001-old.md']);
  const wo = readFileSync(join(dir, 'work-orders', 'WO-001-work.md'), 'utf8');
  assert.match(wo, /\[\[DEC-003\]\]/);
  assert.match(readFileSync(join(dir, 'decisions', 'DEC-001-old.md'), 'utf8'), /^superseded_by: DEC-002$/m);
  assert.deepEqual(checkProject(await loadProject(dir)).issues, []);

  await assert.rejects(
    () => renumberDocument(dir, 'DEC-003', { refs: ['decisions/gone.md'], file: 'decisions/DEC-003-rival.md' }),
    /--refs applies only to contested ids/,
  );
});

test('renumber respects the veri/ids floor and an explicit --to', async (t) => {
  const dir = sandbox(t);
  // A deleted DEC-007 once existed: the floor remembers what the tree cannot.
  writeFileSync(join(dir, 'ids'), 'DEC 7\n');
  const result = await renumberDocument(dir, 'DEC-002');
  assert.equal(result.to, 'DEC-008');
  assert.equal(readIdRecord(dir).DEC, 8);

  const explicit = await renumberDocument(dir, 'DEC-008', { to: 'DEC-020' });
  assert.equal(explicit.to, 'DEC-020');
  assert.equal(explicit.renamedTo, 'decisions/DEC-020-current.md');
  assert.equal(readIdRecord(dir).DEC, 20);
  assert.deepEqual(checkProject(await loadProject(dir)).issues, []);
});
