import { spawn } from 'node:child_process';
import { existsSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CURRENT_FORMAT, DOC_TYPES, ProjectExistsError, approveDocument, assembleContext, checkDrift, checkProject, checkProvenance, classifyFormat, createDocument, formatStatement, isOperableFormat, loadProject, migrateProject, scaffoldProject, workOrdersTouching } from '@veri/core';
import type { DocType, FormatClassification, Issue } from '@veri/core';
import { collectGitFacts } from './git.ts';

export interface CmdResult {
  code: number;
  lines: string[];
}

const TYPE_LIST = DOC_TYPES.join(' | ');

// The skiff demo ships as real markdown files next to dist/ — see DEC-007.
// Exported so the desktop app's New-project flow seeds from the same files
// rather than carrying a second copy (WO-018, DEC-016).
export const DEMO_ROOT = fileURLToPath(new URL('../demo/', import.meta.url));

export function init(cwd: string, opts: { demo: boolean }): CmdResult {
  let result;
  try {
    result = scaffoldProject(cwd, { demo: opts.demo, demoRoot: DEMO_ROOT });
  } catch (err) {
    if (err instanceof ProjectExistsError) {
      return { code: 1, lines: ['veri/ already exists here — nothing to do.'] };
    }
    throw err;
  }
  const lines = opts.demo
    ? [`Installed the skiff demo project: ${result.docCount} documents in veri/.`]
    : ['Initialized veri/ with requirements/, decisions/, work-orders/, sources/, and the default workflow (veri/workflow.md).'];
  for (const extra of result.filesWritten) lines.push(`Wrote ${extra}.`);
  for (const extra of result.filesSkipped) lines.push(`Skipped ${extra} — one already exists here.`);
  if (opts.demo) lines.push('veri check reports 2 deliberate issues here — the demo README explains them.');
  return { code: 0, lines };
}

function requireVeriDir(cwd: string): string | null {
  const dir = join(cwd, 'veri');
  return existsSync(dir) ? dir : null;
}

const NO_VERI_DIR: CmdResult = { code: 1, lines: ['no veri/ directory here — run "veri init" first.'] };

function isDocType(value: string): value is DocType {
  return (DOC_TYPES as readonly string[]).includes(value);
}

export async function newDoc(cwd: string, typeArg: string | undefined, title: string | undefined): Promise<CmdResult> {
  if (typeArg === undefined || !isDocType(typeArg)) {
    return { code: 1, lines: [`usage: veri new <type> "<title>" where <type> is ${TYPE_LIST}`] };
  }
  if (title === undefined || title.trim() === '') {
    return { code: 1, lines: ['a title is required: veri new ' + typeArg + ' "<title>"'] };
  }
  const dir = requireVeriDir(cwd);
  if (dir === null) return NO_VERI_DIR;

  // Creation lives in core so the CLI and the desktop app share one write
  // path (WO-022): next free id, initial status, template, kebab filename.
  try {
    const { id, file } = await createDocument(dir, typeArg, title);
    return { code: 0, lines: [`Created veri/${file} (${id})`] };
  } catch (err) {
    return { code: 1, lines: [`${err instanceof Error ? err.message : String(err)}.`] };
  }
}

function fileOf(issue: Issue): string {
  return issue.kind === 'duplicate-id' ? issue.files.join(', ') : issue.file;
}

/** The veri/ directory's repo-root-relative path with forward slashes, for
    mapping document files onto the paths git reports (WO-045). Both sides
    resolve through realpath — git reports the toplevel symlink-resolved
    (macOS /var vs /private/var), the cwd may not be. */
function veriPathInRepo(repoRoot: string, veriDir: string): string {
  return relative(realpathSync(repoRoot), realpathSync(veriDir)).split(sep).join('/');
}

/** One line naming the format version — and the migration, when one applies (REQ-015). */
function formatLine(format: FormatClassification): string {
  if (format.kind === 'current') return `format ${format.version} (current)`;
  return formatStatement(format) ?? `format ${String(format.kind)}`;
}

export async function check(cwd: string): Promise<CmdResult> {
  const dir = requireVeriDir(cwd);
  if (dir === null) return NO_VERI_DIR;
  const load = await loadProject(dir);
  const { issues, advisories } = checkProject(load);
  // Receipt verification (WO-044) and git drift (WO-045): git facts come
  // from the host, checks stay pure in core (DEC-040). No repository means
  // a note, never a failure.
  const git = collectGitFacts(cwd);
  if (git.kind === 'ok') {
    advisories.push(...checkProvenance(load.documents, git.facts));
    advisories.push(...checkDrift(load.documents, git.facts, veriPathInRepo(git.root, dir)));
  }
  const skipNote = git.kind === 'ok' ? [] : [`(provenance: skipped — ${git.reason})`];
  // Advisories print after issues and never touch the count or exit code (DEC-025).
  const advisoryLines = advisories.map((advisory) => `(advisory) ${advisory.file}: ${advisory.message}`);
  // The format line leads the report (REQ-015); issues, then advisories, then
  // the summary keep their DEC-025 order after it.
  if (issues.length === 0) {
    return {
      code: 0,
      lines: [
        formatLine(load.format),
        ...advisoryLines,
        ...skipNote,
        `ok — ${load.documents.length} documents, 0 issues · ${advisories.length} advisories`,
      ],
    };
  }
  return {
    code: 1,
    lines: [
      formatLine(load.format),
      ...issues.map((issue) => `${fileOf(issue)}: ${issue.message}`),
      ...advisoryLines,
      ...skipNote,
      `${issues.length} issue(s) · ${advisories.length} advisories`,
    ],
  };
}

/**
 * The reverse of a receipt (WO-044, REQ-021): which work orders' commits
 * touched this path, derived live from the WO-nnn: commit convention —
 * never from a stored index. Titles are best-effort decoration: the index
 * works in a repo with no veri/ at all.
 */
export async function implemented(cwd: string, pathArg: string | undefined): Promise<CmdResult> {
  if (pathArg === undefined || pathArg.trim() === '') {
    return { code: 1, lines: ['usage: veri implemented <path>'] };
  }
  const git = collectGitFacts(cwd);
  if (git.kind !== 'ok') {
    return { code: 1, lines: [`cannot derive implemented-in: ${git.reason}`] };
  }
  const hits = workOrdersTouching(git.facts, pathArg.trim());
  if (hits.length === 0) {
    return { code: 0, lines: [`no WO-prefixed commits touched ${pathArg.trim()}`] };
  }
  const titles = new Map<string, string>();
  const dir = requireVeriDir(cwd);
  if (dir !== null) {
    for (const doc of (await loadProject(dir)).documents) titles.set(doc.id, doc.title);
  }
  return {
    code: 0,
    lines: hits.map(({ id, commits }) => {
      const shas = commits.map((commit) => commit.sha.slice(0, 7)).join(' ');
      const title = titles.get(id);
      return `${id.padEnd(8)} ${shas}${title === undefined ? '' : `  ${title}`}`;
    }),
  };
}

/**
 * Print the exact package `get_context` serves (DEC-038): assembly lives in
 * core, so the terminal and MCP channels cannot drift apart. Same format
 * guard as the server (REQ-015): a newer veri/ gets a statement, not a
 * misparse.
 */
export async function context(cwd: string, idArg: string | undefined): Promise<CmdResult> {
  if (idArg === undefined || idArg.trim() === '') {
    return { code: 1, lines: ['usage: veri context <WO-id>'] };
  }
  const dir = requireVeriDir(cwd);
  if (dir === null) return NO_VERI_DIR;
  const format = classifyFormat(dir);
  if (!isOperableFormat(format)) {
    return { code: 1, lines: [formatStatement(format) ?? 'format mismatch'] };
  }
  try {
    const pkg = await assembleContext(cwd, idArg.trim());
    return { code: 0, lines: [pkg.text] };
  } catch (err) {
    return { code: 1, lines: [(err as Error).message] };
  }
}

/** The user's consent act for REQ-015 migrations: invoking this command IS the consent. */
export function migrate(cwd: string): CmdResult {
  const dir = requireVeriDir(cwd);
  if (dir === null) return NO_VERI_DIR;
  let result;
  try {
    result = migrateProject(dir);
  } catch (err) {
    return { code: 1, lines: [(err as Error).message] };
  }
  if (result.applied.length === 0) {
    return { code: 0, lines: [`already format ${CURRENT_FORMAT} (current) — nothing to migrate.`] };
  }
  return {
    code: 0,
    lines: [
      ...result.applied,
      `migrated veri/ from format ${result.from} to ${result.to} — review the diff and commit.`,
    ],
  };
}

/** The user's approval act (REQ-008): draft → accepted / proposed → active, stamped with today. */
export async function approve(cwd: string, idArg: string | undefined): Promise<CmdResult> {
  if (idArg === undefined || idArg.trim() === '') {
    return { code: 1, lines: ['usage: veri approve <id> (a draft requirement or proposed decision)'] };
  }
  const dir = requireVeriDir(cwd);
  if (dir === null) return NO_VERI_DIR;
  try {
    const result = await approveDocument(dir, idArg.trim());
    return {
      code: 0,
      lines: [`${result.id} ${result.from} → ${result.to} — approved: ${result.approved} (veri/${result.file})`],
    };
  } catch (err) {
    return { code: 1, lines: (err as Error).message.split('\n') };
  }
}

export async function list(cwd: string, typeArg: string | undefined): Promise<CmdResult> {
  if (typeArg !== undefined && !isDocType(typeArg)) {
    return { code: 1, lines: [`unknown type "${typeArg}" — expected ${TYPE_LIST}`] };
  }
  const dir = requireVeriDir(cwd);
  if (dir === null) return NO_VERI_DIR;
  const { documents } = await loadProject(dir);
  const docs = documents
    .filter((doc) => typeArg === undefined || doc.type === typeArg)
    .sort((a, b) => a.id.localeCompare(b.id));
  return {
    code: 0,
    lines: docs.map((doc) => `${doc.id.padEnd(8)} ${doc.status.padEnd(12)} ${doc.title}`),
  };
}

// Launching the desktop app needs module resolution and a process spawn;
// both are injectable so tests can exercise the paths without Electron.
export interface OpenDeps {
  resolvePath: (specifier: string) => string;
  launch: (electronBin: string, args: string[]) => void;
}

const defaultOpenDeps: OpenDeps = {
  resolvePath: (specifier) => createRequire(import.meta.url).resolve(specifier),
  launch: (electronBin, args) => {
    const child = spawn(electronBin, args, { detached: true, stdio: 'ignore' });
    child.unref();
  },
};

export function open(cwd: string, dirArg: string | undefined, deps: OpenDeps = defaultOpenDeps): CmdResult {
  const target = resolve(cwd, dirArg ?? '.');
  if (!existsSync(join(target, 'veri'))) {
    return { code: 1, lines: [`no veri/ directory in ${target} — run "veri init" there first.`] };
  }
  let uiDir: string;
  let electronBin: string;
  try {
    const uiPkg = deps.resolvePath('@veri/ui/package.json');
    uiDir = dirname(uiPkg);
    // require('electron') from Node (not inside Electron) returns the
    // binary path; anchor resolution at the UI package, whose dep it is.
    electronBin = createRequire(uiPkg)('electron') as string;
  } catch {
    return {
      code: 1,
      lines: ['cannot find the Veri desktop app (@veri/ui with electron installed) — is this a standalone CLI install?'],
    };
  }
  if (!existsSync(join(uiDir, 'dist', 'main.js'))) {
    return { code: 1, lines: ['@veri/ui is not built — run "npm run build" in packages/ui first.'] };
  }
  deps.launch(electronBin, [uiDir, target]);
  return { code: 0, lines: [`Opening Veri on ${target}…`] };
}
