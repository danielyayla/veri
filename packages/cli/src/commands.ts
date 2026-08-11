import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DOC_TYPES, ProjectExistsError, approveDocument, checkProject, loadProject, scaffoldProject } from '@veri/core';
import type { DocType, Issue } from '@veri/core';
import { BODY_TEMPLATES, INITIAL_STATUS } from './templates.ts';

export interface CmdResult {
  code: number;
  lines: string[];
}

const SUBDIR: Record<DocType, string> = {
  requirement: 'requirements',
  decision: 'decisions',
  'work-order': 'work-orders',
  source: 'sources',
};

const PREFIX: Record<DocType, string> = {
  requirement: 'REQ',
  decision: 'DEC',
  'work-order': 'WO',
  source: 'SRC',
};

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
  if (!opts.demo) {
    return { code: 0, lines: ['Initialized veri/ with requirements/, decisions/, work-orders/, sources/.'] };
  }
  const lines = [`Installed the skiff demo project: ${result.docCount} documents in veri/.`];
  for (const extra of result.filesWritten) lines.push(`Wrote ${extra}.`);
  for (const extra of result.filesSkipped) lines.push(`Skipped ${extra} — one already exists here.`);
  lines.push('veri check reports 2 deliberate issues here — the demo README explains them.');
  return { code: 0, lines };
}

function requireVeriDir(cwd: string): string | null {
  const dir = join(cwd, 'veri');
  return existsSync(dir) ? dir : null;
}

const NO_VERI_DIR: CmdResult = { code: 1, lines: ['no veri/ directory here — run "veri init" first.'] };

function slugify(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '');
  return slug === '' ? 'untitled' : slug;
}

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

  const { documents } = await loadProject(dir);
  const prefix = PREFIX[typeArg];
  const taken = documents
    .map((doc) => doc.id)
    .filter((id) => id.startsWith(`${prefix}-`))
    .map((id) => Number.parseInt(id.slice(prefix.length + 1), 10));
  const next = taken.length === 0 ? 1 : Math.max(...taken) + 1;
  if (next > 999) {
    return { code: 1, lines: [`no free ${prefix}- id left (999 is the highest).`] };
  }
  const id = `${prefix}-${String(next).padStart(3, '0')}`;
  const today = new Date().toISOString().slice(0, 10);
  const frontmatter = [
    '---',
    `id: ${id}`,
    `type: ${typeArg}`,
    `title: ${JSON.stringify(title)}`,
    `status: ${INITIAL_STATUS[typeArg]}`,
    `created: ${today}`,
    `updated: ${today}`,
    '---',
  ].join('\n');
  const relPath = join(SUBDIR[typeArg], `${id}-${slugify(title)}.md`);
  writeFileSync(join(dir, relPath), `${frontmatter}\n${BODY_TEMPLATES[typeArg]}`, { flag: 'wx' });
  return { code: 0, lines: [`Created veri/${relPath} (${id})`] };
}

function fileOf(issue: Issue): string {
  return issue.kind === 'duplicate-id' ? issue.files.join(', ') : issue.file;
}

export async function check(cwd: string): Promise<CmdResult> {
  const dir = requireVeriDir(cwd);
  if (dir === null) return NO_VERI_DIR;
  const load = await loadProject(dir);
  const issues = checkProject(load);
  if (issues.length === 0) {
    return { code: 0, lines: [`ok — ${load.documents.length} documents, 0 issues`] };
  }
  return {
    code: 1,
    lines: [...issues.map((issue) => `${fileOf(issue)}: ${issue.message}`), `${issues.length} issue(s)`],
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
