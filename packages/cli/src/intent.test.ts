import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { intent } from './commands.ts';

function sandbox(t: { after(fn: () => void): void }): string {
  const root = mkdtempSync(join(tmpdir(), 'veri-cli-intent-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

test('veri intent requires a path argument', async (t) => {
  const root = sandbox(t);
  const result = await intent(root, undefined);
  assert.equal(result.code, 1);
  assert.match(result.lines[0], /usage: veri intent <path>/);
});

test('veri intent without a veri/ directory says so', async (t) => {
  const root = sandbox(t);
  const result = await intent(root, 'packages/core');
  assert.equal(result.code, 1);
  assert.match(result.lines[0], /no veri\/ directory/);
});

test('veri intent prints the core render for a receipt-matched path', async (t) => {
  const root = sandbox(t);
  mkdirSync(join(root, 'veri/work-orders'), { recursive: true });
  mkdirSync(join(root, 'veri/requirements'), { recursive: true });
  writeFileSync(
    join(root, 'veri/requirements/REQ-001-base.md'),
    [
      '---',
      'id: REQ-001',
      'type: requirement',
      'title: Base',
      'status: accepted',
      'approved: 2026-08-01',
      'created: 2026-08-01',
      'updated: 2026-08-01',
      '---',
      '',
      'Body.',
      '',
    ].join('\n'),
  );
  writeFileSync(
    join(root, 'veri/work-orders/WO-001-work.md'),
    [
      '---',
      'id: WO-001',
      'type: work-order',
      'title: Ship it',
      'status: done',
      'created: 2026-08-01',
      'updated: 2026-08-01',
      'links:',
      '  - id: REQ-001',
      '    rel: implements',
      '---',
      '',
      '## Receipts',
      '',
      '- 2026-08-01 — abc1234 — src/thing.ts — shipped',
      '',
    ].join('\n'),
  );
  const result = await intent(root, 'src/thing.ts');
  assert.equal(result.code, 0, result.lines.join('\n'));
  const text = result.lines.join('\n');
  assert.match(text, /WO-001\s+done\s+via receipt \(src\/thing\.ts\) — Ship it/);
  assert.match(text, /REQ-001\s+accepted\s+Base — via WO-001 \(implements\)/);
});
