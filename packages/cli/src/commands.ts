import { spawn } from 'node:child_process';
import { existsSync, readdirSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CURRENT_FORMAT, DOC_TYPES, ProjectExistsError, approveDocument, assembleContext, boundTests, buildCheckReport, classifyFormat, compareIds, createDocument, formatStatement, importKickoffPrompt, importSkipNotes, isBrownfieldRoot, isOperableFormat, loadProject, localToday, maintainerRegistry, migrateProject, moduleRegistry, renderArchitecture, renumberDocument, scaffoldProject, workOrdersTouching } from '@veri/core';
import type { CheckReport, DocType } from '@veri/core';
import { collectGitFacts, gitUserName } from './git.ts';
import { collectTestFacts } from './testfacts.ts';
import { collectImportFacts } from './imports.ts';

export interface CmdResult {
  code: number;
  lines: string[];
}

const TYPE_LIST = DOC_TYPES.join(' | ');

// The skiff demo ships as real markdown files next to dist/ — see DEC-007.
// Exported so the desktop app's New-project flow seeds from the same files
// rather than carrying a second copy (WO-018, DEC-016).
export const DEMO_ROOT = fileURLToPath(new URL('../demo/', import.meta.url));

// Starter bundles ship as real markdown files beside the demo (WO-091):
// per-project-type seed corpora, every document draft/proposed (REQ-008).
// Core takes a starterRoot path; the names live here, read from disk, so
// the list can never drift from the shipped content.
const STARTERS_ROOT = fileURLToPath(new URL('../starters/', import.meta.url));

export function listStarters(): string[] {
  return readdirSync(STARTERS_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

/** `starter` semantics: undefined → no flag; '' or another flag's text →
    the flag was given without a usable name (cli.ts passes it through). */
export function init(cwd: string, opts: { demo: boolean; starter?: string }): CmdResult {
  const starters = listStarters();
  const starterList = `available starters: ${starters.join(', ')}`;
  if (opts.starter !== undefined && opts.demo) {
    return { code: 1, lines: ['--demo and --starter are mutually exclusive — pick one seed.'] };
  }
  if (opts.starter !== undefined && (opts.starter === '' || opts.starter.startsWith('--'))) {
    return { code: 1, lines: [`usage: veri init --starter <name> — ${starterList}`] };
  }
  if (opts.starter !== undefined && !starters.includes(opts.starter)) {
    return { code: 1, lines: [`unknown starter "${opts.starter}" — ${starterList}`] };
  }
  let result;
  try {
    result = scaffoldProject(cwd, {
      demo: opts.demo,
      demoRoot: DEMO_ROOT,
      starterRoot: opts.starter === undefined ? undefined : join(STARTERS_ROOT, opts.starter),
    });
  } catch (err) {
    if (err instanceof ProjectExistsError) {
      return { code: 1, lines: ['veri/ already exists here — nothing to do.'] };
    }
    throw err;
  }
  const lines =
    opts.starter !== undefined
      ? [
          `Installed the ${opts.starter} starter: ${result.docCount} seed documents in veri/, every one draft/proposed.`,
          'They bind nothing until you promote them — review each, then "veri approve <id>" or delete it.',
        ]
      : opts.demo
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

/** The veri/ directory's repo-root-relative path with forward slashes, for
    mapping document files onto the paths git reports (WO-045). Both sides
    resolve through realpath — git reports the toplevel symlink-resolved
    (macOS /var vs /private/var), the cwd may not be. */
function veriPathInRepo(repoRoot: string, veriDir: string): string {
  return relative(realpathSync(repoRoot), realpathSync(veriDir)).split(sep).join('/');
}

/**
 * Structured result of the health check (WO-076, REQ-025). The derivation
 * lives in core as buildCheckReport (WO-089) and is shared by the terminal
 * renderer in check(), the GitHub Action runner, and the MCP server's
 * run_check — no surface can disagree with another. This adapter only
 * collects the host facts (DEC-040): git history, bound-test existence,
 * and observed imports. Returns null when cwd has no veri/ directory.
 */
export type { CheckReport } from '@veri/core';

export async function checkReport(cwd: string): Promise<CheckReport | null> {
  const dir = requireVeriDir(cwd);
  if (dir === null) return null;
  const load = await loadProject(dir);
  const git = collectGitFacts(cwd);
  // Bound-test identifiers are repo-root-relative; without a repository
  // root the working directory is the best available anchor (WO-088).
  const root = git.kind === 'ok' ? git.root : cwd;
  const modules = moduleRegistry(load.documents);
  return buildCheckReport(load, {
    git: git.kind === 'ok' ? { kind: 'ok', facts: git.facts, veriPath: veriPathInRepo(git.root, dir) } : git,
    today: localToday(),
    testFacts: collectTestFacts(root, boundTests(load.documents)),
    importFacts: modules.length > 0 ? collectImportFacts(cwd, modules) : undefined,
  });
}

export async function check(cwd: string): Promise<CmdResult> {
  const report = await checkReport(cwd);
  if (report === null) return NO_VERI_DIR;
  const { issues, advisories, skips } = report;
  // Advisories print after issues and never touch the count or exit code (DEC-025).
  const advisoryLines = advisories.map((advisory) => `(advisory) ${advisory.file}: ${advisory.message}`);
  // The format line leads the report (REQ-015); issues, then advisories, then
  // the summary keep their DEC-025 order after it.
  if (issues.length === 0) {
    return {
      code: 0,
      lines: [
        report.formatLine,
        ...advisoryLines,
        ...skips,
        `ok — ${report.documentCount} documents, 0 issues · ${advisories.length} advisories`,
      ],
    };
  }
  return {
    code: 1,
    lines: [
      report.formatLine,
      ...issues.map((issue) => `${issue.file}: ${issue.message}`),
      ...advisoryLines,
      ...skips,
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
    lines: [renderArchitecture(load.documents, observed?.edges), ...importSkipNotes(observed?.skipped ?? [])],
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

/** The user's approval act (REQ-008): draft → accepted / proposed → active, stamped with today.
    In a maintainers project (DEC-071) the stamp names its maintainer: --as
    explicitly, or defaulted from git user.name when that exactly matches a
    listed maintainer — the host collects the identity, core validates it. */
export async function approve(cwd: string, idArg: string | undefined, asName?: string): Promise<CmdResult> {
  if (idArg === undefined || idArg.trim() === '') {
    return { code: 1, lines: ['usage: veri approve <id> [--as <maintainer>] (a draft requirement or proposed decision)'] };
  }
  const dir = requireVeriDir(cwd);
  if (dir === null) return NO_VERI_DIR;
  try {
    let approver = asName?.trim();
    if (approver === undefined || approver === '') {
      const maintainers = maintainerRegistry((await loadProject(dir)).documents);
      const gitName = gitUserName(cwd);
      if (maintainers.length > 0 && gitName !== null && maintainers.includes(gitName)) approver = gitName;
    }
    const result = await approveDocument(dir, idArg.trim(), undefined, approver);
    const by = result.approvedBy === undefined ? '' : ` by ${result.approvedBy}`;
    return {
      code: 0,
      lines: [`${result.id} ${result.from} → ${result.to} — approved: ${result.approved}${by} (veri/${result.file})`],
    };
  } catch (err) {
    return { code: 1, lines: (err as Error).message.split('\n') };
  }
}

/** DEC-070's resolution tool: move a document to a new id, rewriting the id
    line, filename, and inbound references in one atomic pass. Contested ids
    (merge collisions) never have their references rewritten by guessing —
    the remaining ones print for review, --refs follows the named files. */
export async function renumber(
  cwd: string,
  idArg: string | undefined,
  opts: { to?: string; file?: string; refs?: string[] },
): Promise<CmdResult> {
  if (idArg === undefined || idArg.trim() === '') {
    return { code: 1, lines: ['usage: veri renumber <id> [--to <new-id>] [--file <path>] [--refs <path,path>]'] };
  }
  const dir = requireVeriDir(cwd);
  if (dir === null) return NO_VERI_DIR;
  try {
    const result = await renumberDocument(dir, idArg.trim(), opts);
    const lines = [
      `${result.from} → ${result.to} (veri/${result.file} → veri/${result.renamedTo})`,
      ...result.rewrittenFiles.map((file) => `rewrote references in veri/${file}`),
    ];
    if (result.remainingRefs.length > 0) {
      lines.push(
        `${result.remainingRefs.length} reference(s) to ${result.from} still point at the remaining claimant — review each; rerun with --refs <path> for any that meant the moved document:`,
        ...result.remainingRefs.map((ref) => `  veri/${ref.file}:${ref.line}: ${ref.text.trim()}`),
      );
    }
    return { code: 0, lines };
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
