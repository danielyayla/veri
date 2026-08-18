import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { loadProject, nextIdNumber, recordIssuedId } from '@veri/core';

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

export interface FileReceiptInput {
  work_order_id: string;
  commit: string;
  files: string;
  summary: string;
  /** Defaults to today. */
  date?: string;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

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
 * Append one receipt to a work order's "## Receipts" section (see DEC-003:
 * receipts are per session, 0..n per work order, never clobbered).
 */
export async function fileReceipt(projectRoot: string, input: FileReceiptInput): Promise<{ file: string }> {
  const veriDir = requireVeriDir(projectRoot);
  const { documents } = await loadProject(veriDir);
  const workOrder = documents.find((doc) => doc.id === input.work_order_id);
  if (workOrder === undefined) throw new Error(`no document with id ${input.work_order_id}`);
  if (workOrder.type !== 'work-order') {
    throw new Error(`${input.work_order_id} is a ${workOrder.type}; file_receipt expects a work order id`);
  }

  const path = join(veriDir, workOrder.file);
  const raw = await readFile(path, 'utf8');
  const date = input.date ?? today();
  const line = `- ${date} — ${input.commit} — ${input.files} — ${input.summary}`;
  const withReceipt = appendReceipt(raw, line);
  const updated = withReceipt.replace(/^updated: .*$/m, `updated: ${today()}`);
  writeFileSync(path, updated);
  return { file: `veri/${workOrder.file}` };
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
