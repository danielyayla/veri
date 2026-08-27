import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DocType } from './ids.ts';
import { nextIdNumber, recordIssuedId, type IdPrefix } from './idstore.ts';
import { loadProject } from './load.ts';
import { getTemplate } from './templates.ts';
import { localToday } from './dates.ts';
import { PRODUCT_FILES, SOURCE_KINDS } from './pending.ts';
import type { Link } from './types.ts';

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
  product: 'draft',
};

export const TYPE_SUBDIR: Record<DocType, string> = {
  requirement: 'requirements',
  decision: 'decisions',
  'work-order': 'work-orders',
  source: 'sources',
  // The workflow lives at the veri/ root — one per project, no collection dir.
  workflow: '',
  product: 'product',
};

export const TYPE_PREFIX: Record<DocType, string> = {
  requirement: 'REQ',
  decision: 'DEC',
  'work-order': 'WO',
  source: 'SRC',
  workflow: 'WF',
  product: 'PRD',
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

export interface CreateOptions {
  /** Stamp for `created:` and `updated:`. Defaults to today. */
  date?: string;
  /** Body markdown replacing the type's template body (DEC-098: filing
      surfaces compose sections from structured params and pass them here). */
  body?: string;
  /** Outbound frontmatter links. Every target must exist in the project —
      an unknown id throws before anything is written or any id consumed. */
  links?: Link[];
  /** A source's epistemic kind (REQ-038, WO-122). Sources only — validated
      against SOURCE_KINDS so a bad value throws before an id is consumed. */
  kind?: string;
}

/**
 * Create a new document: next free id for the type, initial status, today's
 * dates, the type's body template (or the given body), kebab-case filename.
 * The one creation implementation for every surface — `veri new`, the app,
 * and the MCP filing tools (DEC-098). Never overwrites — the id is free by
 * construction and the write is `wx`.
 */
export async function createDocument(
  veriDir: string | URL,
  type: DocType,
  title: string,
  options: CreateOptions = {},
): Promise<CreateResult> {
  const trimmed = title.trim();
  if (trimmed === '') throw new Error('a title is required');
  // REQ-037: product singletons are fixed files, not a growing collection —
  // generic creation would mint product/PRD-00N-<slug>.md, which the
  // product-file check refuses. They are authored at their sanctioned paths.
  if (type === 'product') {
    throw new Error(
      `product documents are fixed singletons — author one of ${PRODUCT_FILES.join(', ')} directly (REQ-037)`,
    );
  }
  const root = typeof veriDir === 'string' ? veriDir : fileURLToPath(veriDir);
  const date = options.date ?? localToday();
  const links = options.links ?? [];
  if (options.kind !== undefined) {
    if (type !== 'source') throw new Error(`kind is a source field (REQ-038) — a ${type} does not take one here`);
    if (!(SOURCE_KINDS as readonly string[]).includes(options.kind)) {
      throw new Error(`unknown source kind "${options.kind}" — one of: ${SOURCE_KINDS.join(', ')}`);
    }
  }

  const { documents } = await loadProject(root);
  const known = new Set(documents.map((doc) => doc.id));
  for (const link of links) {
    if (!known.has(link.id)) {
      throw new Error(`link target ${link.id} does not exist — the document would fail veri check`);
    }
  }
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
    ...(options.kind !== undefined ? [`kind: ${options.kind}`] : []),
    `created: ${date}`,
    `updated: ${date}`,
    ...(links.length > 0 ? ['links:', ...links.flatMap((link) => [`  - id: ${link.id}`, `    rel: ${link.rel}`])] : []),
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
  const body = options.body ?? getTemplate(root, type).body;
  const text = `${frontmatter}\n${body}`;
  if (TYPE_SUBDIR[type] !== '') mkdirSync(join(root, TYPE_SUBDIR[type]), { recursive: true });
  writeFileSync(join(root, file), text, { flag: 'wx' });
  recordIssuedId(root, prefix, next);
  return { id, file, text };
}
