import { spawn } from 'node:child_process';
import { existsSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CURRENT_FORMAT, DOC_TYPES, ProjectExistsError, approveDocument, assembleContext, checkDrift, checkObservedArchitecture, checkProject, checkProvenance, classifyFormat, compareIds, createDocument, formatStatement, importKickoffPrompt, isBrownfieldRoot, isOperableFormat, loadProject, migrateProject, moduleRegistry, renderArchitecture, scaffoldProject, workOrdersTouching } from '@veri/core';
import type { DocType, FormatClassification, Issue } from '@veri/core';
import { collectGitFacts } from './git.ts';
import { collectImportFacts } from './imports.ts';
import type { ImportFactsResult } from './imports.ts';

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
  // Brownfield on-ramp (REQ-024): a folder with existing code gets the offer.
  if (!opts.demo && isBrownfieldRoot(cwd)) {
    lines.push('This folder has existing code. Run "veri import" to have your agent mine it into proposals.');
  }
  return { code: 0, lines };
}

/** Print the canonical import kickoff prompt (DEC-067) for terminal-first
    users — the same text the app's "Copy import kickoff" button copies. */
export function importPrompt(cwd: string): CmdResult {
  const dir = requireVeriDir(cwd);
  if (dir === null) return NO_VERI_DIR;
  return { code: 0, lines: [importKickoffPrompt()] };
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

/** Skip notes for registry modules the collector could not find on disk (WO-067). */
function importSkipNotes(observed: ImportFactsResult | undefined): string[] {
  return (observed?.skipped ?? []).map(
    (entry) => `(architecture: skipped module ${entry.name} — ${entry.path} is not on disk)`,
  );
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
  // Observed architecture (WO-067): the host collects import edges, core
  // compares them against the intended architecture — same split (DEC-040),
  // same advisory tier (DEC-025). No registry means nothing to observe.
  const modules = moduleRegistry(load.documents);
  const observed = modules.length > 0 ? collectImportFacts(cwd, modules) : undefined;
  if (observed !== undefined) {
    advisories.push(...checkObservedArchitecture(load.documents, observed.edges));
  }
  const skipNote = [
    ...(git.kind === 'ok' ? [] : [`(provenance: skipped — ${git.reason})`]),
    ...importSkipNotes(observed),
  ];
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

/**
 * The compiled intended architecture (DEC-058, WO-066): modules from the
 * registry, then every constraint active decisions assert, each citing its
 * governing DEC. With a registry to scan, the observed side rides along
 * (WO-067): collected import edges give the printout its violations
 * section. Same format guard as context (REQ-015); rendering lives in core
 * so every surface prints the identical projection.
 */
export async function architecture(cwd: string): Promise<CmdResult> {
  const dir = requireVeriDir(cwd);
  if (dir === null) return NO_VERI_DIR;
  const format = classifyFormat(dir);
  if (!isOperableFormat(format)) {
    return { code: 1, lines: [formatStatement(format) ?? 'format mismatch'] };
  }
  const load = await loadProject(dir);
  const modules = moduleRegistry(load.documents);
  const observed = modules.length > 0 ? collectImportFacts(cwd, modules) : undefined;
  return {
    code: 0,
    lines: [renderArchitecture(load.documents, observed?.edges), ...importSkipNotes(observed)],
  };
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
    .sort((a, b) => compareIds(a.id, b.id));
  return {
    code: 0,
    lines: docs.map((doc) => `${doc.id.padEnd(8)} ${doc.status.padEnd(12)} ${doc.title}`),
  };
}

// Launching the desktop app needs module resolution, a process spawn, and a
// binary-existence probe; all are injectable so tests can exercise the paths
// without a built shell.
export interface OpenDeps {
  resolvePath: (specifier: string) => string;
  launch: (shellBin: string, args: string[]) => void;
  exists?: (path: string) => boolean;
}

const defaultOpenDeps: OpenDeps = {
  resolvePath: (specifier) => createRequire(import.meta.url).resolve(specifier),
  launch: (shellBin, args) => {
    const child = spawn(shellBin, args, { detached: true, stdio: 'ignore' });
    child.unref();
  },
};

/** Where the Tauri shell binary lives inside a bundle (WO-073, DEC-063). */
const SHELL_IN_APP = 'Contents/MacOS/veri-shell';

export function open(cwd: string, dirArg: string | undefined, deps: OpenDeps = defaultOpenDeps): CmdResult {
  const exists = deps.exists ?? existsSync;
  const target = resolve(cwd, dirArg ?? '.');
  if (!existsSync(join(target, 'veri'))) {
    return { code: 1, lines: [`no veri/ directory in ${target} — run "veri init" there first.`] };
  }
  // The desktop app is the Tauri shell (WO-073): in a dev checkout the
  // bundled release build next to @veri/ui, otherwise an installed
  // Veri.app. The shell takes the project directory as its one argument.
  const candidates: string[] = [];
  try {
    const uiDir = dirname(deps.resolvePath('@veri/ui/package.json'));
    candidates.push(join(uiDir, 'src-tauri', 'target', 'release', 'bundle', 'macos', 'Veri.app', SHELL_IN_APP));
  } catch {
    // Standalone CLI install — only the installed app can serve.
  }
  candidates.push(join('/Applications', 'Veri.app', SHELL_IN_APP));
  const shellBin = candidates.find((bin) => exists(bin));
  if (shellBin === undefined) {
    return {
      code: 1,
      lines: ['cannot find the Veri desktop app — build it ("npm run dist" in packages/ui) or install Veri.app.'],
    };
  }
  deps.launch(shellBin, [target]);
  return { code: 0, lines: [`Opening Veri on ${target}…`] };
}
