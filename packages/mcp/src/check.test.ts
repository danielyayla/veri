import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GIT_SKIP_REASON, runCheck } from './check.ts';

const CLI = fileURLToPath(new URL('../../cli/src/cli.ts', import.meta.url));

/**
 * The WO-089 parity fixture: one corpus exercising every tier —
 * a gate violation (broken link), a bound test that no longer resolves
 * (drift-missing-test, through this package's own fs collector), a binding
 * claimant (so the git-less binding-drift skip note fires), and a module
 * registry with one module on disk and one missing (architecture skip note).
 * Deliberately not a git repository: the CLI degrades to the same posture
 * the MCP server always has, so the two surfaces must agree completely.
 */
function writeFixture(root: string): void {
  const veri = join(root, 'veri');
  for (const sub of ['requirements', 'work-orders', 'decisions', 'sources']) {
    mkdirSync(join(veri, sub), { recursive: true });
  }
  mkdirSync(join(root, 'src'));
  writeFileSync(join(root, 'src', 'main.ts'), 'export const answer = 42;\n');
  writeFileSync(
    join(veri, 'workflow.md'),
    [
      '---',
      'id: WF-001',
      'type: workflow',
      'title: Fixture workflow',
      'status: accepted',
      'approved: 2026-08-01',
      'created: 2026-08-01',
      'updated: 2026-08-01',
      'links: []',
      'modules:',
      '  - name: app',
      '    path: src',
      '    purpose: The code',
      '  - name: ghost',
      '    path: gone',
      '    purpose: Not on disk',
      '---',
      '',
      '## The path of work',
      '',
      'Work orders first.',
      '',
      '## Rules for implementers',
      '',
      '1. Stay in scope.',
      '',
    ].join('\n'),
  );
  writeFileSync(
    join(veri, 'requirements', 'REQ-001-fixture.md'),
    [
      '---',
      'id: REQ-001',
      'type: requirement',
      'title: Fixture requirement',
      'status: accepted',
      'approved: 2026-08-01',
      'created: 2026-08-01',
      'updated: 2026-08-01',
      'links: []',
      '---',
      '',
      'It must work.',
      '',
      '## Acceptance criteria',
      '',
      '- [ ] It works',
      '',
    ].join('\n'),
  );
  const workOrderBody = [
    '',
    '## Summary',
    '',
    'Fixture work.',
    '',
    '## In scope',
    '',
    '- Everything',
    '',
    '## Out of scope',
    '',
    '- Nothing',
    '',
    '## Requirements',
    '',
    '- [[REQ-001]] — implements',
    '',
    '## Acceptance tests',
    '',
    '- [ ] Passes',
    '',
    '## Receipts',
    '',
    '(none yet)',
    '',
  ];
  writeFileSync(
    join(veri, 'work-orders', 'WO-001-bound.md'),
    [
      '---',
      'id: WO-001',
      'type: work-order',
      'title: Bound fixture work order',
      'status: in-progress',
      'created: 2026-08-01',
      'updated: 2026-08-01',
      'links:',
      '  - id: REQ-001',
      '    rel: implements',
      'binds:',
      '  paths:',
      '    - src/**',
      '  tests:',
      '    - tests/gone.test.ts',
      '---',
      ...workOrderBody,
    ].join('\n'),
  );
  writeFileSync(
    join(veri, 'work-orders', 'WO-002-broken.md'),
    [
      '---',
      'id: WO-002',
      'type: work-order',
      'title: Broken-link fixture work order',
      'status: in-progress',
      'created: 2026-08-01',
      'updated: 2026-08-01',
      'links:',
      '  - id: REQ-001',
      '    rel: implements',
      '  - id: REQ-404',
      '    rel: related',
      '---',
      ...workOrderBody,
    ].join('\n'),
  );
}

test('run_check agrees with the CLI surface on one corpus (WO-089)', async () => {
  const root = mkdtempSync(join(tmpdir(), 'veri-parity-'));
  try {
    writeFixture(root);
    const result = await runCheck(root);
    assert.ok(result !== null);
    const cli = spawnSync(process.execPath, [CLI, 'check'], { cwd: root, encoding: 'utf8' });
    assert.equal(cli.error, undefined, String(cli.error));
    const out = cli.stdout;

    // Exit semantics: an empty issues array mirrors the CLI's exit 0 exactly
    // (the tool's `pass` key is this derivation, serialized at the server edge).
    assert.equal(cli.status, result.issues.length === 0 ? 0 : 1, out + cli.stderr);

    // Every violation and advisory the CLI prints, run_check returns — and
    // the counts in the CLI's summary line match the structured arrays.
    const summary = out.trim().split('\n').at(-1) ?? '';
    const counts = summary.match(/^(\d+) issue\(s\) · (\d+) advisories$/);
    assert.ok(counts, `unexpected summary line: ${summary}`);
    assert.equal(result.issues.length, Number(counts[1]));
    assert.equal(result.advisories.length, Number(counts[2]));
    for (const violation of result.issues) {
      assert.ok(out.includes(`${violation.file}: ${violation.message}`), `CLI missing violation: ${violation.message}`);
    }
    for (const advisory of result.advisories) {
      assert.ok(out.includes(`(advisory) ${advisory.file}: ${advisory.message}`), `CLI missing advisory: ${advisory.message}`);
    }

    // The corpus exercised every tier: a gate violation with machine-readable
    // kind and id, a drift-missing-test advisory through this package's own
    // collector, and the format line on both surfaces.
    assert.ok(result.issues.some((violation) => violation.kind === 'broken-link' && violation.file === 'work-orders/WO-002-broken.md'));
    assert.ok(result.advisories.some((advisory) => advisory.kind === 'drift-missing-test' && advisory.id === 'WO-001'));
    assert.equal(out.trim().split('\n')[0], result.formatLine);

    // Nothing vanishes silently (REQ-021): both surfaces name the checks
    // they could not run. The reasons differ by posture — the CLI is outside
    // a repository, the server is subprocess-free by decision — and only the
    // server's reason cites the posture.
    for (const prefix of ['(provenance: skipped', '(binding drift: skipped', '(architecture: skipped module ghost']) {
      assert.ok(out.includes(prefix), `CLI missing skip note ${prefix}`);
      assert.ok(result.skips.some((note) => note.startsWith(prefix)), `run_check missing skip note ${prefix}`);
    }
    assert.ok(result.skips.some((note) => note.includes(GIT_SKIP_REASON)));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('run_check returns null without a veri directory', async () => {
  const root = mkdtempSync(join(tmpdir(), 'veri-parity-'));
  try {
    assert.equal(await runCheck(root), null);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
