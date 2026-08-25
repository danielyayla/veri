import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AGENTS_MD, CLAUDE_MD_POINTER, defaultWorkflowMd } from '@verikb/core';

// REQ-019's drift test: every `veri <command>` a scaffolded file instructs is
// run against the real CLI dispatch — not grepped against a list that could
// itself go stale. Remove a command from the build and this fails; instruct a
// command the build lacks and this fails.

const CLI = fileURLToPath(new URL('./cli.ts', import.meta.url));

const SCAFFOLDED_TEXT = [AGENTS_MD, CLAUDE_MD_POINTER, defaultWorkflowMd('2026-01-01')].join('\n');

test('every veri command the scaffold instructs exists in the CLI (REQ-019)', (t) => {
  const commands = [...new Set([...SCAFFOLDED_TEXT.matchAll(/`veri ([a-z]+)/g)].map((m) => m[1]!))];
  // Sanity that extraction works: these are known to be instructed today.
  for (const known of ['context', 'approve', 'check']) {
    assert.ok(commands.includes(known), `expected scaffolded text to mention veri ${known}`);
  }
  const cwd = mkdtempSync(join(tmpdir(), 'veri-drift-'));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  for (const command of commands) {
    const run = spawnSync(process.execPath, [CLI, command], { cwd, encoding: 'utf8' });
    const output = run.stdout + run.stderr;
    assert.ok(
      !output.includes('unknown command'),
      `scaffolded text instructs "veri ${command}" but the CLI does not implement it:\n${output}`,
    );
  }
});
