import { spawnSync } from 'node:child_process';
import type { GitFacts } from '@verikb/core';
import { GIT_LOG_FORMAT, parseGitLog } from '@verikb/core';

/**
 * The CLI's git-facts collector (DEC-040): core's provenance and drift
 * checks are pure over these facts; this is the one place the CLI shells
 * out to git. Unavailability is a state, not an error — verification skips
 * with a note (WO-044), never a hard failure. `root` is the repository
 * toplevel, so callers can map veri/-relative document paths onto the
 * repo-root-relative paths git reports (WO-045).
 */
export type GitFactsResult =
  | { kind: 'ok'; facts: GitFacts; root: string }
  | { kind: 'unavailable'; reason: string };

function git(cwd: string, args: string[]): { status: number | null; stdout: string; failed: boolean } {
  const run = spawnSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return { status: run.status, stdout: run.stdout ?? '', failed: run.error !== undefined };
}

/** The committer identity git would stamp here (DEC-071): `veri approve`
    defaults --as from it when it exactly matches a listed maintainer.
    Null when git is absent, unconfigured, or this is not a repository. */
export function gitUserName(cwd: string): string | null {
  const run = git(cwd, ['config', 'user.name']);
  if (run.failed || run.status !== 0) return null;
  const name = run.stdout.trim();
  return name === '' ? null : name;
}

export function collectGitFacts(cwd: string): GitFactsResult {
  const shallow = git(cwd, ['rev-parse', '--is-shallow-repository']);
  if (shallow.failed) return { kind: 'unavailable', reason: 'git is not installed' };
  if (shallow.status !== 0) return { kind: 'unavailable', reason: 'not a git repository' };
  if (shallow.stdout.trim() === 'true') {
    return { kind: 'unavailable', reason: 'shallow clone — full history is not available' };
  }
  const toplevel = git(cwd, ['rev-parse', '--show-toplevel']);
  if (toplevel.status !== 0) return { kind: 'unavailable', reason: 'not a git repository' };
  const log = git(cwd, ['log', '--name-only', `--format=${GIT_LOG_FORMAT}`]);
  if (log.status !== 0) return { kind: 'unavailable', reason: 'no commits yet' };
  return { kind: 'ok', facts: parseGitLog(log.stdout), root: toplevel.stdout.trim() };
}
