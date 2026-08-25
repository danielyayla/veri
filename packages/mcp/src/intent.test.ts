import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { intentForPath } from './intent.ts';

const CLI = fileURLToPath(new URL('../../cli/src/cli.ts', import.meta.url));

function doc(id: string, type: string, title: string, status: string, extra: string[] = [], body = 'Body.'): string {
  return [
    '---',
    `id: ${id}`,
    `type: ${type}`,
    `title: ${title}`,
    `status: ${status}`,
    'created: 2026-08-01',
    'updated: 2026-08-01',
    ...extra,
    '---',
    '',
    body,
    '',
  ].join('\n');
}

/** A corpus exercising all three evidence tiers: a module registry, a done
    work order with a receipt naming core files, and its linked REQ/DEC. */
function sandbox(t: { after(fn: () => void): void }): string {
  const root = mkdtempSync(join(tmpdir(), 'veri-mcp-intent-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const sub of ['requirements', 'decisions', 'work-orders']) {
    mkdirSync(join(root, 'veri', sub), { recursive: true });
  }
  writeFileSync(
    join(root, 'veri/workflow.md'),
    doc('WF-001', 'workflow', 'Workflow', 'accepted', [
      'approved: 2026-08-01',
      'modules:',
      '  - name: core',
      '    path: packages/core',
      '    purpose: Pure domain logic',
    ]),
  );
  writeFileSync(join(root, 'veri/requirements/REQ-001-base.md'), doc('REQ-001', 'requirement', 'Base', 'accepted', ['approved: 2026-08-01']));
  writeFileSync(
    join(root, 'veri/decisions/DEC-001-choice.md'),
    doc('DEC-001', 'decision', 'Choice', 'active', ['approved: 2026-08-01']),
  );
  writeFileSync(
    join(root, 'veri/work-orders/WO-001-work.md'),
    doc(
      'WO-001',
      'work-order',
      'Ship the thing',
      'done',
      ['links:', '  - id: REQ-001', '    rel: implements', '  - id: DEC-001', '    rel: constrained-by'],
      '## Summary\n\nx\n\n## Receipts\n\n- 2026-08-01 — abc1234 — packages/core/src/thing.ts — shipped\n',
    ),
  );
  return root;
}

test('get_intent surfaces receipt-matched work orders and their governing documents', async (t) => {
  const root = sandbox(t);
  const text = await intentForPath(root, 'packages/core/src/thing.ts');
  assert.match(text, /not a code index/);
  assert.match(text, /WO-001\s+done\s+via receipt \(packages\/core\/src\/thing\.ts\) — Ship the thing/);
  assert.match(text, /core · packages\/core — Pure domain logic/);
  assert.match(text, /REQ-001\s+accepted\s+Base — via WO-001 \(implements\)/);
  assert.match(text, /DEC-001\s+active\s+Choice — via WO-001 \(constrained-by\)/);
});

test('a module-only path says no document-level matches exist', async (t) => {
  const root = sandbox(t);
  const text = await intentForPath(root, 'packages/core/src/other.ts');
  assert.match(text, /no document-level matches/);
  assert.match(text, /core · packages\/core/);
});

test('the MCP derivation and the CLI surface print the identical text (DEC-038)', async (t) => {
  const root = sandbox(t);
  const mcp = await intentForPath(root, 'packages/core/src/thing.ts');
  const cli = spawnSync(process.execPath, [CLI, 'intent', 'packages/core/src/thing.ts'], { cwd: root, encoding: 'utf8' });
  assert.equal(cli.error, undefined, String(cli.error));
  assert.equal(cli.status, 0, cli.stdout + cli.stderr);
  assert.equal(cli.stdout.trimEnd(), mcp);
});

test('a root without veri/ is a clear error', async () => {
  await assert.rejects(() => intentForPath(tmpdir(), 'x.ts'), /no veri\/ directory/);
});
