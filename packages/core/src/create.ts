import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DocType } from './ids.ts';
import { nextIdNumber, recordIssuedId, type IdPrefix } from './idstore.ts';
import { loadProject } from './load.ts';
import { getTemplate } from './templates.ts';
import { localToday } from './dates.ts';
import { METHODS_DIR, PRODUCT_FILES, REQUIREMENT_KINDS, SOURCE_KINDS } from './pending.ts';
import type { Link, VeriDocument } from './types.ts';

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
  method: 'draft',
};

export const TYPE_SUBDIR: Record<DocType, string> = {
  requirement: 'requirements',
  decision: 'decisions',
  'work-order': 'work-orders',
  source: 'sources',
  // The workflow lives at the veri/ root — one per project, no collection dir.
  workflow: '',
  product: 'product',
  method: METHODS_DIR,
};

export const TYPE_PREFIX: Record<DocType, string> = {
  requirement: 'REQ',
  decision: 'DEC',
  'work-order': 'WO',
  source: 'SRC',
  workflow: 'WF',
  product: 'PRD',
  method: 'MET',
};

/**
 * What generic creation writes into a new method's required `description`
 * (DEC-130): a prompt, not a guess. It is deliberately unmistakable as a
 * placeholder — the field is the text an emitted skill shell triggers on, and
 * a plausible-sounding invention would trigger on the wrong utterances. The
 * document is born `draft`, so nothing emits until the user has replaced it
 * and approved (DEC-135, proposed).
 */
export const METHOD_DESCRIPTION_PLACEHOLDER =
  'TODO — one paragraph: which utterances should route to this gate, and how it differs from the adjacent ones. This is the text the emitted skill shell triggers on.';

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
  /** The document's epistemic kind: a source's evidence class (REQ-038,
      WO-122) or a requirement's constraint/hypothesis (REQ-032, WO-137).
      Validated against that type's vocabulary, so a bad value throws before
      an id is consumed; no other type takes one. */
  kind?: string;
  /** What would confirm or refute a hypothesis (REQ-032, WO-137):
      requirements only. Creation validates the shape — both halves present
      and non-empty — and leaves the judgment of whether a given requirement
      needs one to `check`, which owns the hypothesis-without-outcome rule. */
  outcome?: { metric: string; target: string | number };
}

/**
 * The stamp a combined file-and-approve act (WO-142) bakes into its one
 * composed write: the promoted status plus the approval lines, exactly what
 * `approveDocument` would have edited in afterwards. Only the user's own
 * surfaces construct one — the MCP filing tools call `createDocument`, which
 * never stamps (REQ-008).
 */
export interface ApprovalStamp {
  /** The promoted status the document is born with (e.g. `accepted`). */
  status: string;
  /** `approved:` date, YYYY-MM-DD. */
  approved: string;
  /** `approved_by:` maintainer name (DEC-071), when the stamp names one. */
  approvedBy?: string;
}

/** A composed-but-unwritten document: everything `writeNewDocument` needs to
    put it on disk and consume its id. The gap between the two calls is where
    the combined act (WO-142) runs the approval gates — nothing exists on disk
    while they run, so a refusal leaves no half-finished state behind. */
export interface ComposedDocument {
  id: string;
  /** Path relative to the veri/ directory, forward slashes. */
  file: string;
  text: string;
  prefix: IdPrefix;
  number: number;
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
  const root = typeof veriDir === 'string' ? veriDir : fileURLToPath(veriDir);
  const { documents } = await loadProject(root);
  const composed = await composeNewDocument(root, documents, type, title, options);
  writeNewDocument(root, composed);
  return { id: composed.id, file: composed.file, text: composed.text };
}

/**
 * Compose a new document without writing it: validation, id selection, and
 * the full text. `createDocument` is compose-plus-write; the combined
 * file-and-approve act (WO-142, DEC-147) runs the approval gates between the
 * two so the document is born already promoted and stamped in a single write.
 * The id is *selected*, not consumed — only `writeNewDocument` records it.
 */
export async function composeNewDocument(
  veriDir: string | URL,
  documents: VeriDocument[],
  type: DocType,
  title: string,
  options: CreateOptions = {},
  stamp?: ApprovalStamp,
): Promise<ComposedDocument> {
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
    // Two vocabularies share one field name (REQ-032 for requirements,
    // REQ-038 for sources); each type is held to its own, and every other
    // type is refused rather than carrying a word the schema would reject.
    const vocabulary: readonly string[] | undefined =
      type === 'source' ? SOURCE_KINDS : type === 'requirement' ? REQUIREMENT_KINDS : undefined;
    if (vocabulary === undefined) {
      throw new Error(`kind is a requirement and source field (REQ-032, REQ-038) — a ${type} does not take one here`);
    }
    if (!vocabulary.includes(options.kind)) {
      throw new Error(`unknown ${type} kind "${options.kind}" — one of: ${vocabulary.join(', ')}`);
    }
  }
  if (options.outcome !== undefined) {
    if (type !== 'requirement') {
      throw new Error(`outcome is a requirement field (REQ-032) — a ${type} does not take one`);
    }
    const { metric, target } = options.outcome;
    if (typeof metric !== 'string' || metric.trim() === '') {
      throw new Error('an outcome needs a metric — what is measured');
    }
    if (typeof target === 'string' ? target.trim() === '' : typeof target !== 'number') {
      throw new Error('an outcome needs a target — the value that would settle the bet');
    }
  }

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
    `status: ${stamp?.status ?? INITIAL_STATUS[type]}`,
    // WO-142: the combined act's stamp rides directly under status — the
    // same lines, in the same order, that approveDocument would edit in.
    ...(stamp !== undefined
      ? [`approved: ${stamp.approved}`, ...(stamp.approvedBy !== undefined ? [`approved_by: ${stamp.approvedBy}`] : [])]
      : []),
    ...(options.kind !== undefined ? [`kind: ${options.kind}`] : []),
    // The bet's terms ride directly under its kind, the order the corpus
    // already reads in. Strings are quoted (the `title` treatment) so a
    // target like "< 5 minutes" or "> 40%" survives YAML; a numeric target
    // stays bare and parses back as a number, which parse normalizes.
    ...(options.outcome !== undefined
      ? [
          'outcome:',
          `  metric: ${JSON.stringify(options.outcome.metric.trim())}`,
          `  target: ${typeof options.outcome.target === 'number' ? options.outcome.target : JSON.stringify(options.outcome.target.trim())}`,
        ]
      : []),
    // DEC-130 (WO-131): `description` and `requires` are required on a
    // method, so generic creation has to write them or hand back a file that
    // fails its own schema. It writes a visible placeholder rather than
    // refusing: methods are an open collection, and authoring the fifteenth
    // gate must stay a change to the project, not to Veri (DEC-135, proposed).
    ...(type === 'method' ? [`description: ${JSON.stringify(METHOD_DESCRIPTION_PLACEHOLDER)}`, 'requires: []'] : []),
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
  return { id, file, text, prefix, number: next };
}

/** Put a composed document on disk and consume its id: mkdir, one `wx`
    write (never an overwrite), and the idstore record — the exact tail
    `createDocument` has always run. */
export function writeNewDocument(veriDir: string | URL, composed: ComposedDocument): void {
  const root = typeof veriDir === 'string' ? veriDir : fileURLToPath(veriDir);
  const subdir = dirname(composed.file);
  if (subdir !== '.' && subdir !== '') mkdirSync(join(root, subdir), { recursive: true });
  writeFileSync(join(root, composed.file), composed.text, { flag: 'wx' });
  recordIssuedId(root, composed.prefix, composed.number);
}
