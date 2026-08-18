import { spawnSync } from 'node:child_process';
import type { GitFacts } from '@veri/core';

/**
 * The CLI's git-facts collector (DEC-040): core's provenance checks are
 * pure over these facts; this is the one place the CLI shells out to git.
 * Unavailability is a state, not an error — verification skips with a note
 * (WO-044), never a hard failure.
 */
export type GitFactsResult = { kind: 'ok'; facts: GitFacts } | { kind: 'unavailable'; reason: string };

function git(cwd: string, args: string[]): { status: number | null; stdout: string; failed: boolean } {
  const run = spawnSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return { status: run.status, stdout: run.stdout ?? '', failed: run.error !== undefined };
}

// \x01 separates commits, \x02 separates SHA from subject — bytes that
// cannot appear in either field, so parsing needs no escaping rules.
const LOG_FORMAT = '%x01%H%x02%s';

export function collectGitFacts(cwd: string): GitFactsResult {
  const shallow = git(cwd, ['rev-parse', '--is-shallow-repository']);
  if (shallow.failed) return { kind: 'unavailable', reason: 'git is not installed' };
  if (shallow.status !== 0) return { kind: 'unavailable', reason: 'not a git repository' };
  if (shallow.stdout.trim() === 'true') {
    return { kind: 'unavailable', reason: 'shallow clone — full history is not available' };
  }
  const log = git(cwd, ['log', '--name-only', `--format=${LOG_FORMAT}`]);
  if (log.status !== 0) return { kind: 'unavailable', reason: 'no commits yet' };
  const commits = log.stdout
    .split('\x01')
    .filter((entry) => entry.includes('\x02'))
    .map((entry) => {
      const separator = entry.indexOf('\x02');
      const lines = entry.slice(separator + 1).split('\n');
      return {
        sha: entry.slice(0, separator).trim(),
        subject: lines[0],
        files: lines
          .slice(1)
          .map((line) => line.trim())
          .filter((line) => line !== ''),
      };
    });
  return { kind: 'ok', facts: { commits } };
}
