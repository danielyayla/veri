import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DocType } from './ids.ts';
import { nextIdNumber, recordIssuedId, type IdPrefix } from './idstore.ts';
import { loadProject } from './load.ts';
import { getTemplate } from './templates.ts';
import { localToday } from './dates.ts';

/**
 * Document creation (REQ-009 §2): type + title in, a check-passing file out.
 * One implementation shared by `veri new` and the desktop app's creation
 * flow, the same posture as scaffold/approve (DEC-015, DEC-016).
 */

/** Initial status for a freshly created document of each type. Every new
    document starts unapproved — promotion is the user's act (REQ-008). */
export const INITIAL_STATUS: Record<DocType, string> = {
  requirement: 'draft',
  decision: 'proposed',
  'work-order': 'backlog',
  source: 'imported',
  workflow: 'draft',
};

export const TYPE_SUBDIR: Record<DocType, string> = {
  requirement: 'requirements',
  decision: 'decisions',
  'work-order': 'work-orders',
  source: 'sources',
  // The workflow lives at the veri/ root — one per project, no collection dir.
  workflow: '',
};

export const TYPE_PREFIX: Record<DocType, string> = {
  requirement: 'REQ',
  decision: 'DEC',
  'work-order': 'WO',
  source: 'SRC',
  workflow: 'WF',
};

export function slugifyTitle(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '');
  return slug === '' ? 'untitled' : slug;
}

export interface CreateResult {
  id: string;
  /** Path relative to the veri/ directory. */
  file: string;
  text: string;
}

/**
 * Create a new document: next free id for the type, initial status, today's
 * dates, the type's body template, kebab-case filename. Never overwrites —
 * the id is free by construction and the write is `wx`.
 */
export async function createDocument(
  veriDir: string | URL,
  type: DocType,
  title: string,
  date: string = localToday(),
): Promise<CreateResult> {
  const trimmed = title.trim();
  if (trimmed === '') throw new Error('a title is required');
  const root = typeof veriDir === 'string' ? veriDir : fileURLToPath(veriDir);

  const { documents } = await loadProject(root);
  const prefix = TYPE_PREFIX[type] as IdPrefix;
  const next = nextIdNumber(
    root,
    prefix,
    documents.map((doc) => doc.id),
  );
  const id = `${prefix}-${String(next).padStart(3, '0')}`;

  const frontmatter = [
    '---',
    `id: ${id}`,
    `type: ${type}`,
    `title: ${JSON.stringify(trimmed)}`,
    `status: ${INITIAL_STATUS[type]}`,
    `created: ${date}`,
    `updated: ${date}`,
    // WO-088: new work orders surface the binding block ready to uncomment —
    // the field is optional, so the commented form changes nothing.
    ...(type === 'work-order'
      ? ['# binds:         # code this work order claims (optional)', '#   paths: []    # repo-root-relative globs', '#   tests: []    # test files proving it (path or path::name)']
      : []),
    '---',
  ].join('\n');
  // Forward slashes always: `file` is the veri/-relative contract path
  // (loadProject, receipts, links all speak this form), not an OS path.
  const file = `${TYPE_SUBDIR[type]}/${id}-${slugifyTitle(trimmed)}.md`;
  const text = `${frontmatter}\n${getTemplate(root, type).body}`;
  writeFileSync(join(root, file), text, { flag: 'wx' });
  recordIssuedId(root, prefix, next);
  return { id, file, text };
}
