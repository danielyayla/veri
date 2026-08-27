import { existsSync, statSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';
import { ProjectExistsError, VERI_SUBDIRS, scaffoldProject } from '@verikb/core';

/**
 * The front door on a bare repo (REQ-041 item 5, WO-129): a session that
 * meets a project with no `veri/` can bring the knowledge base into being
 * without shelling out to the CLI, so the skill library (DEC-125) opens
 * on any repository rather than only on ones that already ran `veri init`.
 *
 * There is no second scaffold here. `scaffoldProject` in core is the one
 * implementation — the same call `veri init` and the desktop app's
 * New-project flow make, so the tree this door produces is identical to
 * theirs by construction (WO-018). This module contributes only the two
 * things a door owes: where it is allowed to write, and how it says no.
 *
 * Consent is not mechanical and is not pretended to be (DEC-133): the tool
 * is self-describing, the host's tool-approval prompt is the ceremony, and
 * the write is bounded and reversible — an existing `veri/` is refused, an
 * existing file is never overwritten, and every path created is named back
 * so an unasked init can be undone by deleting exactly those.
 */

/** What `init_project` created, as the caller can verify it on disk. */
export interface InitResult {
  /**
   * The directory that now contains the knowledge base, relative to the
   * server's project root; `.` for the root itself.
   */
  root: string;
  /** The created `veri/` directory, relative to the server's project root. */
  veriDir: string;
  /** Markdown documents installed — 1 for an empty scaffold: workflow.md. */
  docCount: number;
  /** Root-level files written, e.g. `["AGENTS.md", "CLAUDE.md"]`. */
  filesWritten: string[];
  /** Root-level files skipped because one already existed. */
  filesSkipped: string[];
}

/** Project-relative, POSIX-slashed, `.` for the root itself — the path shape
    every other tool on this surface answers in. */
function display(projectRoot: string, target: string): string {
  const rel = relative(projectRoot, target).replaceAll('\\', '/');
  return rel === '' ? '.' : rel;
}

/**
 * Where the door is allowed to write: inside the root this server was
 * started on, and nowhere else. `projectRoot` comes from the host's own
 * argv, so it is the one boundary the user actually chose; a path argument
 * that climbs out of it is refused rather than resolved, and so is one
 * naming a directory that does not exist — creating `veri/` inside a typo
 * is the silent no-op PRD-003 rules out.
 */
function resolveTarget(projectRoot: string, path?: string): string {
  const target = resolve(projectRoot, path ?? '.');
  const rel = relative(projectRoot, target);
  if (rel.startsWith('..') || isAbsolute(rel)) {
    throw new Error(`${path} resolves outside this server's project root (${projectRoot}) — init writes only inside it`);
  }
  if (!existsSync(target) || !statSync(target).isDirectory()) {
    throw new Error(`no such directory: ${display(projectRoot, target)} (under ${projectRoot}) — create it first, or omit path to initialize the project root`);
  }
  return target;
}

/**
 * Scaffold a knowledge base into `path` (default: the project root itself).
 *
 * Refuses rather than overwrites when a `veri/` is already there — the
 * guarantee `scaffoldProject` makes with `ProjectExistsError`, carried
 * through to this surface intact and restated with the directory named.
 * Bringing an older `veri/` to the current format is `veri migrate`'s job,
 * not this door's.
 */
export function initProject(projectRoot: string, path?: string): InitResult {
  const target = resolveTarget(projectRoot, path);
  const root = display(projectRoot, target);
  try {
    const result = scaffoldProject(target);
    return {
      root,
      veriDir: root === '.' ? 'veri' : `${root}/veri`,
      docCount: result.docCount,
      filesWritten: result.filesWritten,
      filesSkipped: result.filesSkipped,
    };
  } catch (err) {
    if (err instanceof ProjectExistsError) {
      throw new Error(
        `${root === '.' ? 'veri/' : `${root}/veri`} already exists in ${err.dir} — nothing was created. ` +
          'An existing knowledge base is never touched: read it with list_documents, or run `veri migrate` in a terminal if its format is behind.',
      );
    }
    throw err;
  }
}

/** What was created, path by path, so the write is legible after the fact
    and undoable by deleting exactly what is named. */
export function renderInit(result: InitResult): string {
  const lines = [
    `Initialized ${result.veriDir} — ${result.docCount} document${result.docCount === 1 ? '' : 's'} ` +
      `(the project workflow), the ${VERI_SUBDIRS.join('/, ')}/ collections, and the document templates.`,
  ];
  for (const file of result.filesWritten) lines.push(`Wrote ${result.root === '.' ? '' : `${result.root}/`}${file} — a pointer at the workflow, not content (DEC-018).`);
  for (const file of result.filesSkipped) lines.push(`Skipped ${result.root === '.' ? '' : `${result.root}/`}${file} — one already exists there and was left untouched.`);
  lines.push(
    'Nothing else on disk was changed: everything above is newly created, so this is undone by deleting exactly those paths.',
    'The knowledge base is empty by design. Nothing binds until the user files documents and approves them (REQ-008).',
  );
  return lines.join('\n');
}
