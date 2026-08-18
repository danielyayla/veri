import { execFile } from 'node:child_process';
import { existsSync, realpathSync } from 'node:fs';
import { basename, join, relative, sep } from 'node:path';
import { promisify } from 'node:util';
import { GIT_LOG_FORMAT, buildGraph, checkDrift, checkProject, checkProvenance, loadProject, parseGitLog } from '@veri/core';
import type { Advisory, Edge, GitFacts, Issue, VeriDocument } from '@veri/core';

const run = promisify(execFile);

export interface GitInfo {
  branch: string;
  dirty: boolean;
  sha: string;
}

/** Everything the renderer needs, as plain JSON. All derivation happens in @veri/core. */
export interface Snapshot {
  projectName: string;
  root: string;
  documents: VeriDocument[];
  issues: Issue[];
  advisories: Advisory[];
  edges: Edge[];
  git: GitInfo | null;
}

async function gitInfo(root: string): Promise<GitInfo | null> {
  try {
    const opts = { cwd: root };
    const [branch, status, sha] = await Promise.all([
      run('git', ['rev-parse', '--abbrev-ref', 'HEAD'], opts),
      run('git', ['status', '--porcelain'], opts),
      run('git', ['rev-parse', '--short', 'HEAD'], opts),
    ]);
    return {
      branch: branch.stdout.trim(),
      dirty: status.stdout.trim() !== '',
      sha: sha.stdout.trim(),
    };
  } catch {
    return null;
  }
}

/**
 * The Electron host's git-facts collector (DEC-040): the same core checks the
 * CLI runs, fed by this host's own git shelling. Any failure — no git, no
 * repository, shallow clone — degrades to null and the git-backed advisories
 * simply don't appear; the pure tier always does.
 */
async function gitFactsFor(projectRoot: string, veriDir: string): Promise<{ facts: GitFacts; veriPath: string } | null> {
  try {
    const opts = { cwd: projectRoot, maxBuffer: 64 * 1024 * 1024 };
    const shallow = await run('git', ['rev-parse', '--is-shallow-repository'], opts);
    if (shallow.stdout.trim() === 'true') return null;
    const toplevel = await run('git', ['rev-parse', '--show-toplevel'], opts);
    const log = await run('git', ['log', '--name-only', `--format=${GIT_LOG_FORMAT}`], opts);
    // realpath both sides: git resolves symlinks in the toplevel (macOS
    // /var vs /private/var); the project path may arrive unresolved.
    const veriPath = relative(realpathSync(toplevel.stdout.trim()), realpathSync(veriDir)).split(sep).join('/');
    return { facts: parseGitLog(log.stdout), veriPath };
  } catch {
    return null;
  }
}

export async function buildSnapshot(projectRoot: string): Promise<Snapshot> {
  const veriDir = join(projectRoot, 'veri');
  if (!existsSync(veriDir)) throw new Error(`no veri/ directory under ${projectRoot}`);
  const load = await loadProject(veriDir);
  const graph = buildGraph(load.documents);
  // Both tiers ship (WO-026, SRC-010), but every health count and color in
  // the renderer stays driven by `issues` alone (DEC-025).
  const { issues, advisories } = checkProject(load);
  // Git-backed advisories — receipt verification (WO-044) and drift
  // (WO-045) — join the same tier when this host can collect facts.
  const git = await gitFactsFor(projectRoot, veriDir);
  if (git !== null) {
    advisories.push(...checkProvenance(load.documents, git.facts));
    advisories.push(...checkDrift(load.documents, git.facts, git.veriPath));
  }
  return {
    projectName: basename(projectRoot),
    root: projectRoot,
    documents: load.documents,
    issues,
    advisories,
    edges: graph.edges,
    git: await gitInfo(projectRoot),
  };
}
