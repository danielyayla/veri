import { constants, copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { recordIssuedId } from './idstore.ts';
import type { IdPrefix } from './idstore.ts';
import { writeDefaultTemplates } from './templates.ts';
import { FORMAT_FILE, writeFormatMarker } from './format.ts';
import { AGENTS_MD, CLAUDE_MD_POINTER, defaultWorkflowMd } from './workflow-default.ts';
import { localToday } from './dates.ts';

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
   * `README.md` and `CLAUDE.md`). The demo ships inside `@verikb/cli` per
   * DEC-007, so every caller supplies its own path rather than core
   * reaching across packages for it.
   */
  demoRoot?: string | URL;
  /**
   * Directory holding one starter bundle's project root (a `veri/`
   * directory of seed documents, all `draft`/`proposed` per REQ-008 —
   * a conversation starter the owner promotes or deletes, never silent
   * canon). Starter bundles ship inside `@verikb/cli` beside the demo
   * (WO-091); like `demoRoot`, every caller supplies the path — core
   * resolves no bundle names. Mutually exclusive with `demo`.
   */
  starterRoot?: string | URL;
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
  if (opts.demo === true && opts.starterRoot !== undefined) {
    throw new Error('demo and starterRoot are mutually exclusive — pick one seed');
  }

  if (opts.starterRoot !== undefined) {
    const starterRoot = typeof opts.starterRoot === 'string' ? opts.starterRoot : fileURLToPath(opts.starterRoot);
    cpSync(join(starterRoot, 'veri'), veriDir, { recursive: true });
    // A bundle only ships the directories it seeds; every project still
    // gets the full layout (REQ-001), empty types held by .gitkeep like
    // the plain scaffold's.
    for (const sub of VERI_SUBDIRS) {
      const dir = join(veriDir, sub);
      mkdirSync(dir, { recursive: true });
      if (readdirSync(dir).length === 0) writeFileSync(join(dir, '.gitkeep'), '');
    }
    // Seeded documents are born at init: their `created`/`updated` stamps
    // read the local calendar (DEC-076), not the fixture's placeholder
    // dates. The demo path deliberately keeps its fictional history.
    stampSeededDates(veriDir, localToday());
    // Same fallbacks as the demo path: a bundle may ship its own workflow
    // and marker; only what is absent gets the default.
    if (!existsSync(join(veriDir, 'workflow.md'))) {
      writeFileSync(join(veriDir, 'workflow.md'), defaultWorkflowMd(localToday()));
    }
    if (!existsSync(join(veriDir, FORMAT_FILE))) writeFormatMarker(veriDir);
    writeDefaultTemplates(veriDir);
    // Seeded ids feed the veri/ids high-water record (DEC-037) so the
    // floor is correct from the first document filed after init.
    recordSeededIds(veriDir);
    const { filesWritten, filesSkipped } = writePointerFiles(root);
    return { veriDir, docCount: countMarkdownDocs(veriDir), filesWritten, filesSkipped };
  }

  if (opts.demo !== true) {
    for (const sub of VERI_SUBDIRS) {
      mkdirSync(join(veriDir, sub), { recursive: true });
      writeFileSync(join(veriDir, sub, '.gitkeep'), '');
    }
    writeFileSync(join(veriDir, 'workflow.md'), defaultWorkflowMd(localToday()));
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
    writeFileSync(join(veriDir, 'workflow.md'), defaultWorkflowMd(localToday()));
  }
  // A demo may ship its own marker (it should); stamp only if it doesn't.
  if (!existsSync(join(veriDir, FORMAT_FILE))) writeFormatMarker(veriDir);
  // Never overwrites templates a demo ships itself (DEC-023).
  writeDefaultTemplates(veriDir);
  const docCount = countMarkdownDocs(veriDir);

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

/** Seeded document paths: every .md under veri/ except templates/ (not documents). */
function markdownDocFiles(veriDir: string): string[] {
  return readdirSync(veriDir, { recursive: true })
    .map((entry) => String(entry).replaceAll('\\', '/'))
    .filter((entry) => entry.endsWith('.md') && !entry.startsWith('templates/'))
    .map((entry) => join(veriDir, entry));
}

function countMarkdownDocs(veriDir: string): number {
  return markdownDocFiles(veriDir).length;
}

// Frontmatter only — the block between the leading `---` fences — so a body
// line that happens to start with "created:" is never touched.
function stampSeededDates(veriDir: string, date: string): void {
  for (const file of markdownDocFiles(veriDir)) {
    const text = readFileSync(file, 'utf8');
    const end = text.indexOf('\n---', 3);
    if (!text.startsWith('---\n') || end < 0) continue;
    const frontmatter = text
      .slice(0, end)
      .replace(/^created: .*$/m, `created: ${date}`)
      .replace(/^updated: .*$/m, `updated: ${date}`);
    writeFileSync(file, frontmatter + text.slice(end));
  }
}

const SEEDED_ID_RE = /^id:\s*(REQ|DEC|WO|SRC|WF)-0*(\d+)\s*$/m;

/** Record every seeded id's high-water mark in veri/ids (DEC-037). */
function recordSeededIds(veriDir: string): void {
  const highest = new Map<IdPrefix, number>();
  for (const file of markdownDocFiles(veriDir)) {
    const match = SEEDED_ID_RE.exec(readFileSync(file, 'utf8'));
    if (match === null) continue;
    const prefix = match[1] as IdPrefix;
    const n = Number.parseInt(match[2]!, 10);
    if (n > (highest.get(prefix) ?? 0)) highest.set(prefix, n);
  }
  for (const [prefix, n] of highest) recordIssuedId(veriDir, prefix, n);
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
