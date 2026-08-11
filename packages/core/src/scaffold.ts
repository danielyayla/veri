import { constants, copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The four subdirectories every Veri project has (REQ-001). */
export const VERI_SUBDIRS = ['requirements', 'decisions', 'work-orders', 'sources'] as const;

export interface ScaffoldOptions {
  /**
   * Seed the project with the bundled skiff demo instead of empty
   * subdirectories. Requires `demoRoot`.
   */
  demo?: boolean;
  /**
   * Directory holding the demo project root (a `veri/` directory plus
   * `README.md` and `CLAUDE.md`). The demo ships inside `@veri/cli` per
   * DEC-007, so every caller supplies its own path rather than core
   * reaching across packages for it.
   */
  demoRoot?: string | URL;
}

export interface ScaffoldResult {
  /** The `veri/` directory that was created. */
  veriDir: string;
  /** Markdown documents installed (0 for an empty scaffold). */
  docCount: number;
  /** Root-level files written by a demo scaffold, e.g. `["README.md"]`. */
  filesWritten: string[];
  /** Root-level demo files skipped because one already existed. */
  filesSkipped: string[];
}

/** Thrown when the target directory already holds a `veri/` — never overwrite. */
export class ProjectExistsError extends Error {
  readonly dir: string;
  constructor(dir: string) {
    super(`veri/ already exists in ${dir}`);
    this.name = 'ProjectExistsError';
    this.dir = dir;
  }
}

/**
 * Create a Veri project in `root`, the directory that will *contain* `veri/`.
 *
 * The one scaffold implementation: `veri init` and the desktop app's
 * "New project…" flow both call this, so the trees they produce are
 * identical by construction (WO-018). A non-empty `root` is fine — Veri
 * lives alongside code — but an existing `veri/` is never touched.
 */
export function scaffoldProject(root: string, opts: ScaffoldOptions = {}): ScaffoldResult {
  const veriDir = join(root, 'veri');
  if (existsSync(veriDir)) throw new ProjectExistsError(root);

  if (opts.demo !== true) {
    for (const sub of VERI_SUBDIRS) {
      mkdirSync(join(veriDir, sub), { recursive: true });
      writeFileSync(join(veriDir, sub, '.gitkeep'), '');
    }
    return { veriDir, docCount: 0, filesWritten: [], filesSkipped: [] };
  }

  if (opts.demoRoot === undefined) throw new Error('demo scaffold requires demoRoot');
  const demoRoot = typeof opts.demoRoot === 'string' ? opts.demoRoot : fileURLToPath(opts.demoRoot);

  cpSync(join(demoRoot, 'veri'), veriDir, { recursive: true });
  const docCount = readdirSync(veriDir, { recursive: true }).filter((entry) => String(entry).endsWith('.md')).length;

  // COPYFILE_EXCL: the demo's README/CLAUDE.md never clobber a user's own (DEC-007).
  const filesWritten: string[] = [];
  const filesSkipped: string[] = [];
  for (const extra of ['README.md', 'CLAUDE.md']) {
    try {
      copyFileSync(join(demoRoot, extra), join(root, extra), constants.COPYFILE_EXCL);
      filesWritten.push(extra);
    } catch {
      filesSkipped.push(extra);
    }
  }
  return { veriDir, docCount, filesWritten, filesSkipped };
}
