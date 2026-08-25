import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { loadProject, localToday, nextIdNumber, recordIssuedId } from '@verikb/core';

export interface FileDecisionInput {
  title: string;
  choice: string;
  rejected_alternatives?: string;
  rationale?: string;
  links?: Array<{ id: string; rel: string }>;
}

export interface FileWorkOrderInput {
  title: string;
  summary: string;
  in_scope?: string;
  out_of_scope?: string;
  acceptance_tests?: string;
  links?: Array<{ id: string; rel: string }>;
}

export interface FileRequirementInput {
  title: string;
  body: string;
  acceptance_criteria?: string;
  links?: Array<{ id: string; rel: string }>;
}

export interface FileSourceInput {
  title: string;
  body: string;
  links?: Array<{ id: string; rel: string }>;
}

export interface FileReceiptInput {
  work_order_id: string;
  commit: string;
  files: string;
  summary: string;
  /** Defaults to today. */
  date?: string;
}

// One clock for every stamp: the local calendar date, matching git's %cs
// committer dates the drift detectors compare against (WO-074).
const today = localToday;

function slugify(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '');
  return slug === '' ? 'untitled' : slug;
}

function requireVeriDir(projectRoot: string): string {
  const dir = join(projectRoot, 'veri');
  if (!existsSync(dir)) throw new Error(`no veri/ directory under ${projectRoot}`);
  return dir;
}

/** Create a new decision document with the next free DEC id. Returns its id and file. */
export async function fileDecision(
  projectRoot: string,
  input: FileDecisionInput,
): Promise<{ id: string; file: string }> {
  const veriDir = requireVeriDir(projectRoot);
  const { documents } = await loadProject(veriDir);

  const known = new Set(documents.map((doc) => doc.id));
  for (const link of input.links ?? []) {
    if (!known.has(link.id)) {
      throw new Error(`link target ${link.id} does not exist — the decision would fail veri check`);
    }
  }

  const next = nextIdNumber(
    veriDir,
    'DEC',
    documents.map((doc) => doc.id),
  );
  const id = `DEC-${String(next).padStart(3, '0')}`;

  const date = today();
  const frontmatter = [
    '---',
    `id: ${id}`,
    'type: decision',
    `title: ${JSON.stringify(input.title)}`,
    'status: proposed', // agent-filed decisions are never born binding — REQ-008
    `created: ${date}`,
    `updated: ${date}`,
    ...(input.links && input.links.length > 0
      ? ['links:', ...input.links.flatMap((link) => [`  - id: ${link.id}`, `    rel: ${link.rel}`])]
      : []),
    '---',
  ].join('\n');

  const sections = [`## Choice\n\n${input.choice.trim()}`];
  if (input.rejected_alternatives !== undefined && input.rejected_alternatives.trim() !== '') {
    sections.push(`## Rejected alternatives\n\n${input.rejected_alternatives.trim()}`);
  }
  if (input.rationale !== undefined && input.rationale.trim() !== '') {
    sections.push(`## Rationale\n\n${input.rationale.trim()}`);
  }

  const file = join('decisions', `${id}-${slugify(input.title)}.md`);
  mkdirSync(join(veriDir, 'decisions'), { recursive: true });
  writeFileSync(join(veriDir, file), `${frontmatter}\n\n${sections.join('\n\n')}\n`, { flag: 'wx' });
  recordIssuedId(veriDir, 'DEC', next);
  return { id, file: `veri/${file}` };
}

/**
 * Propose a work order with the next free WO id. Born `backlog`, so it is
 * gate-safe by construction (DEC-022) and never binding on its own; the id
 * is consumed permanently through the shared allocator (DEC-037).
 */
export async function fileWorkOrder(
  projectRoot: string,
  input: FileWorkOrderInput,
): Promise<{ id: string; file: string }> {
  const veriDir = requireVeriDir(projectRoot);
  const { documents } = await loadProject(veriDir);

  const known = new Set(documents.map((doc) => doc.id));
  for (const link of input.links ?? []) {
    if (!known.has(link.id)) {
      throw new Error(`link target ${link.id} does not exist — the work order would fail veri check`);
    }
  }

  const next = nextIdNumber(
    veriDir,
    'WO',
    documents.map((doc) => doc.id),
  );
  const id = `WO-${String(next).padStart(3, '0')}`;

  const date = today();
  const frontmatter = [
    '---',
    `id: ${id}`,
    'type: work-order',
    `title: ${JSON.stringify(input.title)}`,
    'status: backlog', // proposals never start started — the gate is on leaving backlog (DEC-022)
    `created: ${date}`,
    `updated: ${date}`,
    ...(input.links && input.links.length > 0
      ? ['links:', ...input.links.flatMap((link) => [`  - id: ${link.id}`, `    rel: ${link.rel}`])]
      : []),
    '---',
  ].join('\n');

  const sections = [`## Summary\n\n${input.summary.trim()}`];
  if (input.in_scope !== undefined && input.in_scope.trim() !== '') {
    sections.push(`## In scope\n\n${input.in_scope.trim()}`);
  }
  if (input.out_of_scope !== undefined && input.out_of_scope.trim() !== '') {
    sections.push(`## Out of scope\n\n${input.out_of_scope.trim()}`);
  }
  if (input.links && input.links.length > 0) {
    sections.push(`## Requirements\n\n${input.links.map((link) => `- [[${link.id}]] — ${link.rel}`).join('\n')}`);
  }
  if (input.acceptance_tests !== undefined && input.acceptance_tests.trim() !== '') {
    sections.push(`## Acceptance tests\n\n${input.acceptance_tests.trim()}`);
  }
  sections.push('## Receipts\n\n(none yet)');

  const file = join('work-orders', `${id}-${slugify(input.title)}.md`);
  mkdirSync(join(veriDir, 'work-orders'), { recursive: true });
  writeFileSync(join(veriDir, file), `${frontmatter}\n\n${sections.join('\n\n')}\n`, { flag: 'wx' });
  recordIssuedId(veriDir, 'WO', next);
  return { id, file: `veri/${file}` };
}

/**
 * File a requirement as a draft with the next free REQ id. Born `draft`
 * (REQ-008: agent writes are never binding), used by the brownfield import
 * filing surface (DEC-068) and any session proposing a requirement.
 */
export async function fileRequirement(
  projectRoot: string,
  input: FileRequirementInput,
): Promise<{ id: string; file: string }> {
  const veriDir = requireVeriDir(projectRoot);
  const { documents } = await loadProject(veriDir);

  const known = new Set(documents.map((doc) => doc.id));
  for (const link of input.links ?? []) {
    if (!known.has(link.id)) {
      throw new Error(`link target ${link.id} does not exist — the requirement would fail veri check`);
    }
  }

  const next = nextIdNumber(
    veriDir,
    'REQ',
    documents.map((doc) => doc.id),
  );
  const id = `REQ-${String(next).padStart(3, '0')}`;

  const date = today();
  const frontmatter = [
    '---',
    `id: ${id}`,
    'type: requirement',
    `title: ${JSON.stringify(input.title)}`,
    'status: draft', // agent-filed requirements are never born binding — REQ-008
    `created: ${date}`,
    `updated: ${date}`,
    ...(input.links && input.links.length > 0
      ? ['links:', ...input.links.flatMap((link) => [`  - id: ${link.id}`, `    rel: ${link.rel}`])]
      : []),
    '---',
  ].join('\n');

  const sections = [input.body.trim()];
  if (input.acceptance_criteria !== undefined && input.acceptance_criteria.trim() !== '') {
    sections.push(`## Acceptance criteria\n\n${input.acceptance_criteria.trim()}`);
  }

  const file = join('requirements', `${id}-${slugify(input.title)}.md`);
  mkdirSync(join(veriDir, 'requirements'), { recursive: true });
  writeFileSync(join(veriDir, file), `${frontmatter}\n\n${sections.join('\n\n')}\n`, { flag: 'wx' });
  recordIssuedId(veriDir, 'REQ', next);
  return { id, file: `veri/${file}` };
}

/**
 * File a source document with the next free SRC id. Sources are born
 * `imported` — their one, terminal status. The brownfield import files its
 * manifest and evidence documents through here (DEC-068).
 */
export async function fileSource(
  projectRoot: string,
  input: FileSourceInput,
): Promise<{ id: string; file: string }> {
  const veriDir = requireVeriDir(projectRoot);
  const { documents } = await loadProject(veriDir);

  const known = new Set(documents.map((doc) => doc.id));
  for (const link of input.links ?? []) {
    if (!known.has(link.id)) {
      throw new Error(`link target ${link.id} does not exist — the source would fail veri check`);
    }
  }

  const next = nextIdNumber(
    veriDir,
    'SRC',
    documents.map((doc) => doc.id),
  );
  const id = `SRC-${String(next).padStart(3, '0')}`;

  const date = today();
  const frontmatter = [
    '---',
    `id: ${id}`,
    'type: source',
    `title: ${JSON.stringify(input.title)}`,
    'status: imported',
    `created: ${date}`,
    `updated: ${date}`,
    ...(input.links && input.links.length > 0
      ? ['links:', ...input.links.flatMap((link) => [`  - id: ${link.id}`, `    rel: ${link.rel}`])]
      : []),
    '---',
  ].join('\n');

  const file = join('sources', `${id}-${slugify(input.title)}.md`);
  mkdirSync(join(veriDir, 'sources'), { recursive: true });
  writeFileSync(join(veriDir, file), `${frontmatter}\n\n${input.body.trim()}\n`, { flag: 'wx' });
  recordIssuedId(veriDir, 'SRC', next);
  return { id, file: `veri/${file}` };
}

/**
 * Append one receipt to a work order's "## Receipts" section (see DEC-003:
 * receipts are per session, 0..n per work order, never clobbered). Per
 * DEC-068 an import manifest — a source with inbound `imported-via` links —
 * also accepts receipts: the manifest receipt is the import's completion
 * signal. Receipts on any other source remain an error.
 */
export async function fileReceipt(projectRoot: string, input: FileReceiptInput): Promise<{ file: string }> {
  const veriDir = requireVeriDir(projectRoot);
  const { documents } = await loadProject(veriDir);
  const target = documents.find((doc) => doc.id === input.work_order_id);
  if (target === undefined) throw new Error(`no document with id ${input.work_order_id}`);
  if (target.type !== 'work-order') {
    const isManifest =
      target.type === 'source' &&
      documents.some((doc) => doc.links.some((link) => link.id === target.id && link.rel === 'imported-via'));
    if (!isManifest) {
      throw new Error(
        `${input.work_order_id} is a ${target.type}; file_receipt expects a work order ` +
          `or an import manifest (a source with inbound imported-via links)`,
      );
    }
  }

  const path = join(veriDir, target.file);
  const raw = await readFile(path, 'utf8');
  const date = input.date ?? today();
  const line = `- ${date} — ${input.commit} — ${input.files} — ${input.summary}`;
  const withReceipt = appendReceipt(raw, line);
  const updated = withReceipt.replace(/^updated: .*$/m, `updated: ${today()}`);
  writeFileSync(path, updated);
  return { file: `veri/${target.file}` };
}

function appendReceipt(content: string, line: string): string {
  const heading = /^## Receipts[ \t]*$/m.exec(content);
  if (heading === null) {
    return `${content.trimEnd()}\n\n## Receipts\n\n${line}\n`;
  }
  const afterHeading = heading.index + heading[0].length;
  const rest = content.slice(afterHeading);
  const nextHeading = rest.search(/^##\s/m);
  const sectionEnd = nextHeading >= 0 ? afterHeading + nextHeading : content.length;

  const existing = content
    .slice(afterHeading, sectionEnd)
    .replace(/^\(none yet\)[ \t]*$/m, '')
    .trim();
  const before = content.slice(0, afterHeading);
  const after = content.slice(sectionEnd);
  const section = `\n\n${existing === '' ? '' : `${existing}\n`}${line}\n`;
  return `${before}${section}${after === '' ? '' : `\n${after}`}`;
}
