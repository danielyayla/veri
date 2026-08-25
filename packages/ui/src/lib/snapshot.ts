import { execFile } from 'node:child_process';
import { existsSync, realpathSync } from 'node:fs';
import { readFile, readdir, stat } from 'node:fs/promises';
import { basename, join, relative, sep } from 'node:path';
import { promisify } from 'node:util';
import {
  GIT_LOG_FORMAT,
  assembleArchitecture,
  boundTests,
  buildGraph,
  classifyFormat,
  deriveFindings,
  isBrownfieldRoot,
  loadProject,
  localToday,
  parseDocument,
  parseGitLog,
} from '@verikb/core';
import type {
  Advisory,
  ArchProjection,
  Edge,
  GitFactsInput,
  HostFacts,
  ImportEdge,
  Issue,
  LoadResult,
  ModuleEntry,
  VeriDocument,
} from '@verikb/core';
import { collectExportFacts, collectImportFacts, collectTestFacts } from '@verikb/cli';
import type { ModuleFileFact } from '@verikb/cli';

const run = promisify(execFile);

export interface GitInfo {
  branch: string;
  dirty: boolean;
  sha: string;
}

/** The observed side of the architecture (WO-068): what this host collected
    from the codebase with the CLI's collectors (the allowed ui → cli edge,
    DEC-060/DEC-016). Everything the Map, the detail panel, and the contents
    drill-down render — the renderer never touches the filesystem. */
export interface ArchObserved {
  /** Cross-module import edges, per file and specifier (WO-067 shape). */
  edges: ImportEdge[];
  /** Registry modules whose path is not on disk — ghosted cards, never errors. */
  skipped: ModuleEntry[];
  /** Every scanned source file with its import specifiers (the drill-down). */
  files: ModuleFileFact[];
  /** Entry-point exports per module (discovered · exports, DEC-087). */
  exports: Record<string, string[]>;
}

/** Everything the renderer needs, as plain JSON. All derivation happens in @verikb/core. */
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
  /** The compiled intended architecture (DEC-058) — deterministic over documents. */
  architecture: ArchProjection;
  /** Host-collected observed structure; empty shapes when no registry exists. */
  archObserved: ArchObserved;
  /** Checks this host could not run, worded by core (WO-093, REQ-021).
      Carried for parity with buildCheckReport; no view renders it yet. */
  skips: string[];
}

/**
 * Architecture on the snapshot pipeline (WO-068): compile the projection and
 * scan the registry's module paths with the CLI collectors. Severity routing
 * of observed violations (DEC-061/DEC-062) happens in core's deriveFindings,
 * which takes `edges`/`skipped` as this host's importFacts (WO-093); the
 * extra `files`/`exports` feed the Map's drill-down only. No registry → no
 * scan, empty observed shapes, and the projection still compiles (its
 * emptiness is the view's declare-modules hint). Collection re-runs on every
 * (debounced, SRC-031) rebuild — the scan is the CLI's own per-check cost,
 * uncached like every other fact.
 */
function collectArchitecture(
  projectRoot: string,
  documents: VeriDocument[],
): { architecture: ArchProjection; archObserved: ArchObserved; importFacts?: { edges: ImportEdge[]; skipped: ModuleEntry[] } } {
  const architecture = assembleArchitecture(documents);
  if (architecture.modules.length === 0) {
    return { architecture, archObserved: { edges: [], skipped: [], files: [], exports: {} } };
  }
  const { edges, skipped, files } = collectImportFacts(projectRoot, architecture.modules);
  return {
    architecture,
    archObserved: { edges, skipped, files, exports: collectExportFacts(projectRoot, architecture.modules) },
    importFacts: { edges, skipped },
  };
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

/** What this host's git shelling produced: core's GitFactsInput plus the
    repository toplevel — the anchor bound-test paths resolve against
    (WO-088's repo-root-relative ids). Outside a repository the anchor
    degrades to the project root, matching the CLI. */
interface GitCollected {
  input: GitFactsInput;
  root: string;
}

/**
 * The app host's git-facts collector (DEC-040): the same core checks the
 * CLI runs, fed by this host's own git shelling. Unavailability is a state
 * with a reason (WO-093) — worded like the CLI's collector — so core's skip
 * notes carry real text; the pure tier always runs.
 */
async function gitFactsFor(projectRoot: string, veriDir: string): Promise<GitCollected> {
  const opts = { cwd: projectRoot, maxBuffer: 64 * 1024 * 1024 };
  let shallow;
  try {
    shallow = await run('git', ['rev-parse', '--is-shallow-repository'], opts);
  } catch (err) {
    const reason = (err as NodeJS.ErrnoException).code === 'ENOENT' ? 'git is not installed' : 'not a git repository';
    return { input: { kind: 'unavailable', reason }, root: projectRoot };
  }
  if (shallow.stdout.trim() === 'true') {
    return { input: { kind: 'unavailable', reason: 'shallow clone — full history is not available' }, root: projectRoot };
  }
  try {
    const toplevel = await run('git', ['rev-parse', '--show-toplevel'], opts);
    const log = await run('git', ['log', '--name-only', `--format=${GIT_LOG_FORMAT}`], opts);
    // realpath both sides: git resolves symlinks in the toplevel (macOS
    // /var vs /private/var); the project path may arrive unresolved.
    const root = toplevel.stdout.trim();
    const veriPath = relative(realpathSync(root), realpathSync(veriDir)).split(sep).join('/');
    return { input: { kind: 'ok', facts: parseGitLog(log.stdout), veriPath }, root };
  } catch {
    return { input: { kind: 'unavailable', reason: 'no commits yet' }, root: projectRoot };
  }
}

/** This host's facts, assembled for core's deriveFindings (WO-093) — the
    same fields the CLI and MCP hosts hand it, from this host's collectors. */
function hostFacts(git: GitCollected, load: LoadResult, importFacts?: { edges: ImportEdge[]; skipped: ModuleEntry[] }): HostFacts {
  return {
    git: git.input,
    today: localToday(),
    testFacts: collectTestFacts(git.root, boundTests(load.documents)),
    importFacts,
  };
}

export async function buildSnapshot(projectRoot: string): Promise<Snapshot> {
  const veriDir = join(projectRoot, 'veri');
  if (!existsSync(veriDir)) throw new Error(`no veri/ directory under ${projectRoot}`);
  const load = await loadProject(veriDir);
  const graph = buildGraph(load.documents);
  const git = await gitFactsFor(projectRoot, veriDir);
  const arch = collectArchitecture(projectRoot, load.documents);
  // The shared derivation (WO-093, DEC-091): pure tier, git-backed tier,
  // bound tests, and observed-architecture severity routing all happen in
  // core — this host only collected the facts. Both tiers ship (WO-026,
  // SRC-010), but every health count and color in the renderer stays driven
  // by `issues` alone (DEC-025).
  const findings = deriveFindings(load, hostFacts(git, load, arch.importFacts));
  return {
    projectName: basename(projectRoot),
    root: projectRoot,
    documents: load.documents,
    issues: findings.issues,
    advisories: findings.advisories,
    edges: graph.edges,
    git: await gitInfo(projectRoot),
    brownfield: isBrownfieldRoot(projectRoot),
    architecture: arch.architecture,
    archObserved: arch.archObserved,
    skips: findings.skips,
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
  #gitFacts: { sha: string; result: GitCollected } | null = null;
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
    const info = await gitInfo(projectRoot);
    const git = await this.#gitFactsCached(projectRoot, veriDir, info);
    // Same collection as buildSnapshot (WO-068): the scan re-runs per
    // debounced rebuild — module source trees are outside the doc cache's
    // mtime horizon, and guessing staleness would trade correctness for
    // milliseconds the debounce already absorbs.
    const arch = collectArchitecture(projectRoot, load.documents);
    const findings = deriveFindings(load, hostFacts(git, load, arch.importFacts));
    const snap: Snapshot = {
      projectName: basename(projectRoot),
      root: projectRoot,
      documents: load.documents,
      issues: findings.issues,
      advisories: findings.advisories,
      edges: graph.edges,
      git: info,
      brownfield: isBrownfieldRoot(projectRoot),
      architecture: arch.architecture,
      archObserved: arch.archObserved,
      skips: findings.skips,
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
   * drift and provenance derive from commits, not the worktree. Unavailable
   * results (no git, shallow clone) are never cached: those probes fail
   * fast and cheap, and staying live means an unshallowed repo is noticed
   * without a HEAD move.
   */
  async #gitFactsCached(projectRoot: string, veriDir: string, info: GitInfo | null): Promise<GitCollected> {
    if (info !== null && this.#gitFacts !== null && this.#gitFacts.sha === info.sha) {
      return this.#gitFacts.result;
    }
    this.gitFactsCount++;
    const result = await gitFactsFor(projectRoot, veriDir);
    this.#gitFacts = info !== null && result.input.kind === 'ok' ? { sha: info.sha, result } : null;
    return result;
  }
}
