import { constants, copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeDefaultTemplates } from './templates.ts';
import { FORMAT_FILE, writeFormatMarker } from './format.ts';
import { AGENTS_MD, CLAUDE_MD_POINTER, defaultWorkflowMd } from './workflow-default.ts';

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
  /** Markdown documents installed (1 for an empty scaffold: workflow.md). */
  docCount: number;
  /** Root-level files written, e.g. `["README.md", "AGENTS.md", "CLAUDE.md"]`. */
  filesWritten: string[];
  /** Root-level files skipped because one already existed. */
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
    writeFileSync(join(veriDir, 'workflow.md'), defaultWorkflowMd(today()));
    writeFormatMarker(veriDir);
    writeDefaultTemplates(veriDir);
    const { filesWritten, filesSkipped } = writePointerFiles(root);
    return { veriDir, docCount: 1, filesWritten, filesSkipped };
  }

  if (opts.demoRoot === undefined) throw new Error('demo scaffold requires demoRoot');
  const demoRoot = typeof opts.demoRoot === 'string' ? opts.demoRoot : fileURLToPath(opts.demoRoot);

  cpSync(join(demoRoot, 'veri'), veriDir, { recursive: true });
  // A demo may ship its own workflow.md; only projects without one get the default.
  if (!existsSync(join(veriDir, 'workflow.md'))) {
    writeFileSync(join(veriDir, 'workflow.md'), defaultWorkflowMd(today()));
  }
  // A demo may ship its own marker (it should); stamp only if it doesn't.
  if (!existsSync(join(veriDir, FORMAT_FILE))) writeFormatMarker(veriDir);
  // Never overwrites templates a demo ships itself (DEC-023).
  writeDefaultTemplates(veriDir);
  const docCount = readdirSync(veriDir, { recursive: true })
    .map((entry) => String(entry).replaceAll('\\', '/'))
    .filter((entry) => entry.endsWith('.md') && !entry.startsWith('templates/')).length;

  // COPYFILE_EXCL: the demo's README never clobbers a user's own (DEC-007).
  const filesWritten: string[] = [];
  const filesSkipped: string[] = [];
  try {
    copyFileSync(join(demoRoot, 'README.md'), join(root, 'README.md'), constants.COPYFILE_EXCL);
    filesWritten.push('README.md');
  } catch {
    filesSkipped.push('README.md');
  }
  const pointers = writePointerFiles(root);
  filesWritten.push(...pointers.filesWritten);
  filesSkipped.push(...pointers.filesSkipped);
  return { veriDir, docCount, filesWritten, filesSkipped };
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// Harness entry files are generated pointers, never content (DEC-018).
// Same never-clobber posture as the demo README: an existing file wins.
function writePointerFiles(root: string): { filesWritten: string[]; filesSkipped: string[] } {
  const filesWritten: string[] = [];
  const filesSkipped: string[] = [];
  const pointers: Array<[string, string]> = [
    ['AGENTS.md', AGENTS_MD],
    ['CLAUDE.md', CLAUDE_MD_POINTER],
  ];
  for (const [name, content] of pointers) {
    try {
      writeFileSync(join(root, name), content, { flag: 'wx' });
      filesWritten.push(name);
    } catch {
      filesSkipped.push(name);
    }
  }
  return { filesWritten, filesSkipped };
}
