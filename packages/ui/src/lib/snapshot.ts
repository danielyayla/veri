import { execFile } from 'node:child_process';
import { existsSync, realpathSync } from 'node:fs';
import { readFile, readdir, stat } from 'node:fs/promises';
import { basename, join, relative, sep } from 'node:path';
import { promisify } from 'node:util';
import {
  GIT_LOG_FORMAT,
  buildGraph,
  checkDrift,
  checkProject,
  checkProvenance,
  classifyFormat,
  isBrownfieldRoot,
  loadProject,
  parseDocument,
  parseGitLog,
} from '@veri/core';
import type { Advisory, Edge, GitFacts, Issue, LoadResult, VeriDocument } from '@veri/core';

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
  /** The root holds files beyond what veri init writes (REQ-024): the
      brownfield import offer's predicate, re-derived every build. */
  brownfield: boolean;
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
    brownfield: isBrownfieldRoot(projectRoot),
  };
}

/**
 * The doc listing exactly as loadProject computes it: every .md under veri/,
 * templates/ excluded (DEC-023), forward slashes, sorted. This ordering is
 * the documents[] ordering, which propagates everywhere — the equivalence
 * test (WO-051) holds this duplicate to core's truth.
 */
function listDocFiles(entries: string[]): string[] {
  return entries
    .filter((entry) => entry.endsWith('.md'))
    .map((entry) => entry.replaceAll('\\', '/'))
    .filter((file) => !file.startsWith('templates/'))
    .sort();
}

/**
 * Light stat for the project switcher (WO-051): how many documents exist,
 * by readdir alone — no parse, no git. A row that can't be listed counts 0.
 */
export async function countProjectDocs(projectRoot: string): Promise<number> {
  try {
    const entries = await readdir(join(projectRoot, 'veri'), { recursive: true });
    return listDocFiles(entries).length;
  } catch {
    return 0;
  }
}

interface DocCacheEntry {
  mtimeMs: number;
  size: number;
  doc: VeriDocument | null;
  issues: Issue[];
}

/**
 * Incremental snapshots (WO-051, SRC-031): two in-memory caches — documents
 * keyed by path+mtime+size, git facts keyed by HEAD — so a rebuild re-parses
 * only changed files and re-runs the full-history git log only when HEAD
 * moves. Everything downstream (graph, checks, provenance, drift) recomputes
 * in full from the cached inputs every build; the Snapshot shape is
 * byte-identical to buildSnapshot's. Nothing is ever persisted — files are
 * truth (DEC-002) and the caches die with the process. Any doubt (stat or
 * read failure mid-pass) falls back to a cold loadProject with the cache
 * dropped.
 */
export class SnapshotBuilder {
  #root: string | null = null;
  #docs = new Map<string, DocCacheEntry>();
  #gitFacts: { sha: string; result: { facts: GitFacts; veriPath: string } } | null = null;
  #current: Snapshot | null = null;

  /** Test instrumentation: how many files have been read+parsed. */
  parseCount = 0;
  /** Test instrumentation: how many times git facts were collected (the full-history log). */
  gitFactsCount = 0;
  /** Test instrumentation: how many doubt-driven cold loadProject fallbacks ran. */
  fullLoadCount = 0;

  /** The last successfully built snapshot, for consumers that only need a recent one. */
  get current(): Snapshot | null {
    return this.#current;
  }

  /** Drop every cache — the next build starts cold. Called on project switch. */
  reset(): void {
    this.#root = null;
    this.#docs.clear();
    this.#gitFacts = null;
    this.#current = null;
  }

  async build(projectRoot: string): Promise<Snapshot> {
    // Self-guarding against a re-point that skipped reset(): caches from one
    // project must never serve another.
    if (this.#root !== projectRoot) {
      this.reset();
      this.#root = projectRoot;
    }
    const veriDir = join(projectRoot, 'veri');
    if (!existsSync(veriDir)) throw new Error(`no veri/ directory under ${projectRoot}`);
    const load = await this.#loadIncremental(veriDir);
    const graph = buildGraph(load.documents);
    const { issues, advisories } = checkProject(load);
    const info = await gitInfo(projectRoot);
    const git = await this.#gitFactsCached(projectRoot, veriDir, info);
    if (git !== null) {
      advisories.push(...checkProvenance(load.documents, git.facts));
      advisories.push(...checkDrift(load.documents, git.facts, git.veriPath));
    }
    const snap: Snapshot = {
      projectName: basename(projectRoot),
      root: projectRoot,
      documents: load.documents,
      issues,
      advisories,
      edges: graph.edges,
      git: info,
      brownfield: isBrownfieldRoot(projectRoot),
    };
    this.#current = snap;
    return snap;
  }

  /**
   * loadProject's exact semantics, incrementally: readdir stays the truth
   * about what exists (deletions reconcile by dropping out of the listing),
   * a stat pass finds what changed, and only changed/new files are re-read
   * and re-parsed — concurrently. Unchanged documents are reused by
   * reference. documents[] and issues[] are assembled in sorted-file order,
   * exactly as loadProject emits them.
   */
  async #loadIncremental(veriDir: string): Promise<LoadResult> {
    const entries = await readdir(veriDir, { recursive: true });
    const files = listDocFiles(entries);
    const next = new Map<string, DocCacheEntry>();
    try {
      const stats = await Promise.all(files.map((file) => stat(join(veriDir, file))));
      await Promise.all(
        files.map(async (file, i) => {
          const { mtimeMs, size } = stats[i]!;
          const prev = this.#docs.get(file);
          if (prev !== undefined && prev.mtimeMs === mtimeMs && prev.size === size) {
            next.set(file, prev);
            return;
          }
          const content = await readFile(join(veriDir, file), 'utf8');
          this.parseCount++;
          const outcome = parseDocument(file, content);
          next.set(file, { mtimeMs, size, doc: outcome.document ?? null, issues: outcome.issues });
        }),
      );
    } catch {
      // Doubt — a file vanished between readdir and stat, a dangling
      // symlink, an unreadable file. Cold loadProject is the truth; the
      // cache restarts empty rather than guess.
      this.#docs.clear();
      this.fullLoadCount++;
      return loadProject(veriDir);
    }
    this.#docs = next;
    const documents: VeriDocument[] = [];
    const issues: Issue[] = [];
    for (const file of files) {
      const entry = next.get(file)!;
      if (entry.doc !== null) documents.push(entry.doc);
      issues.push(...entry.issues);
    }
    return { documents, issues, dir: veriDir, format: classifyFormat(veriDir) };
  }

  /**
   * Git facts keyed by HEAD (SRC-031): the expensive full-history log
   * re-runs only when HEAD moves; a dirty-flag flip alone re-runs nothing —
   * drift and provenance derive from commits, not the worktree. Null
   * results (no git, shallow clone) are never cached: those probes fail
   * fast and cheap, and staying live means an unshallowed repo is noticed
   * without a HEAD move.
   */
  async #gitFactsCached(
    projectRoot: string,
    veriDir: string,
    info: GitInfo | null,
  ): Promise<{ facts: GitFacts; veriPath: string } | null> {
    if (info !== null && this.#gitFacts !== null && this.#gitFacts.sha === info.sha) {
      return this.#gitFacts.result;
    }
    this.gitFactsCount++;
    const result = await gitFactsFor(projectRoot, veriDir);
    this.#gitFacts = info !== null && result !== null ? { sha: info.sha, result } : null;
    return result;
  }
}
