import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { basename, join } from 'node:path';
import { promisify } from 'node:util';
import { buildGraph, checkProject, loadProject } from '@veri/core';
import type { Advisory, Edge, Issue, VeriDocument } from '@veri/core';

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

export async function buildSnapshot(projectRoot: string): Promise<Snapshot> {
  const veriDir = join(projectRoot, 'veri');
  if (!existsSync(veriDir)) throw new Error(`no veri/ directory under ${projectRoot}`);
  const load = await loadProject(veriDir);
  const graph = buildGraph(load.documents);
  // Both tiers ship (WO-026, SRC-010), but every health count and color in
  // the renderer stays driven by `issues` alone (DEC-025).
  const { issues, advisories } = checkProject(load);
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
