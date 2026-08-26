/**
 * The discard sidecar channels (WO-110, SRC-052, DEC-110): `withdraw-doc`
 * and `delete-doc` over core's own functions, with `delete-doc`'s probe mode
 * returning the guard's verdict without acting — so the popover can state a
 * refusal instead of hiding the control. Exercised against a scratch project
 * on disk, exactly as the sidecar runs them.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkProject, loadProject } from '@verikb/core';
import { createSidecar } from './app.ts';

/** The WO-110 acceptance bar: zero check violations after each discard. */
async function assertCheckClean(root: string): Promise<void> {
  const load = await loadProject(join(root, 'veri'));
  assert.deepEqual(checkProject(load).issues, []);
}

function writeDoc(veriDir: string, file: string, frontmatter: string, body = 'Body.\n'): void {
  writeFileSync(join(veriDir, file), `---\n${frontmatter}\n---\n\n${body}`);
}

/** A scratch project: one deletable decision, one approved requirement, one
    referenced source, one withdrawable work order. */
function scratchProject(t: { after(fn: () => void): void }): string {
  const root = mkdtempSync(join(tmpdir(), 'veri-ui-discard-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const veri = join(root, 'veri');
  for (const sub of ['decisions', 'requirements', 'sources', 'work-orders']) {
    mkdirSync(join(veri, sub), { recursive: true });
  }
  writeDoc(
    veri,
    'decisions/DEC-001-scratch.md',
    'id: DEC-001\ntype: decision\ntitle: A scratch proposal\nstatus: proposed\ncreated: 2026-08-26\nupdated: 2026-08-26',
  );
  writeDoc(
    veri,
    'requirements/REQ-001-approved.md',
    'id: REQ-001\ntype: requirement\ntitle: An approved requirement\nstatus: accepted\napproved: 2026-08-20\ncreated: 2026-08-01\nupdated: 2026-08-20',
  );
  writeDoc(
    veri,
    'sources/SRC-001-referenced.md',
    'id: SRC-001\ntype: source\ntitle: A referenced source\nstatus: imported\ncreated: 2026-08-26\nupdated: 2026-08-26',
  );
  writeDoc(
    veri,
    'decisions/DEC-002-referrer.md',
    'id: DEC-002\ntype: decision\ntitle: A referrer\nstatus: proposed\ncreated: 2026-08-26\nupdated: 2026-08-26\nlinks:\n  - id: SRC-001\n    rel: informed-by',
  );
  writeDoc(
    veri,
    'work-orders/WO-001-withdrawable.md',
    'id: WO-001\ntype: work-order\ntitle: A withdrawable work order\nstatus: backlog\ncreated: 2026-08-26\nupdated: 2026-08-26',
  );
  return root;
}

/** Invoke a protocol method the way the dispatcher does — untyped params. */
function invoker(root: string): (method: string, ...params: unknown[]) => Promise<unknown> {
  const { methods } = sidecarFor(root);
  return (method, ...params) => Promise.resolve((methods[method] as (...args: unknown[]) => unknown)(...params));
}

function sidecarFor(root: string): ReturnType<typeof createSidecar> {
  return createSidecar({
    appVersion: '0.0.0-test',
    packaged: false,
    configDir: join(root, '.config'),
    logDir: join(root, '.logs'),
    explicitRoot: root,
    cwd: root,
    emit: () => {},
  });
}

test('withdraw-doc flips the document to withdrawn via core, touching status and updated alone', async (t) => {
  const root = scratchProject(t);
  const call = invoker(root);
  const result = (await call('withdraw-doc', 'WO-001')) as { id: string; file: string; from: string };
  assert.deepEqual({ id: result.id, from: result.from }, { id: 'WO-001', from: 'backlog' });
  const raw = readFileSync(join(root, 'veri', result.file), 'utf8');
  assert.match(raw, /^status: withdrawn$/m);
  assert.match(raw, /^title: A withdrawable work order$/m);
  await assertCheckClean(root);
});

test('delete-doc probe returns the guard verdict without touching the disk', async (t) => {
  const root = scratchProject(t);
  const call = invoker(root);
  const allowed = (await call('delete-doc', 'DEC-001', true)) as { refusal: string | null };
  assert.equal(allowed.refusal, null);
  const approved = (await call('delete-doc', 'REQ-001', true)) as { refusal: string | null };
  assert.match(approved.refusal!, /approved 2026-08-20/);
  const referenced = (await call('delete-doc', 'SRC-001', true)) as { refusal: string | null };
  assert.match(referenced.refusal!, /DEC-002/);
  // The probe wrote nothing: every file is still there.
  for (const file of ['decisions/DEC-001-scratch.md', 'requirements/REQ-001-approved.md', 'sources/SRC-001-referenced.md']) {
    assert.ok(existsSync(join(root, 'veri', file)), file);
  }
});

test('delete-doc removes an unapproved, unreferenced document', async (t) => {
  const root = scratchProject(t);
  const call = invoker(root);
  const result = (await call('delete-doc', 'DEC-001', false)) as { id: string; file: string };
  assert.equal(result.id, 'DEC-001');
  assert.equal(existsSync(join(root, 'veri', result.file)), false);
  await assertCheckClean(root);
});

test('delete-doc refuses through core when the guard says no — the file stays', async (t) => {
  const root = scratchProject(t);
  const call = invoker(root);
  await assert.rejects(async () => call('delete-doc', 'REQ-001', false), /approved 2026-08-20/);
  await assert.rejects(async () => call('delete-doc', 'SRC-001', false), /DEC-002/);
  assert.ok(existsSync(join(root, 'veri', 'requirements/REQ-001-approved.md')));
  assert.ok(existsSync(join(root, 'veri', 'sources/SRC-001-referenced.md')));
});
