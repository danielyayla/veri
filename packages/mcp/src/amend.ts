import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { loadProject, parseDocument, saveDocumentFile } from '@verikb/core';

export interface AmendDocumentInput {
  id: string;
  title?: string;
  /** Full replacement body (everything below the frontmatter). Must not
      contain a Receipts section — receipts stay append-only via file_receipt;
      the on-disk section is carried over verbatim. */
  body?: string;
  /** Full replacement of the frontmatter links list. */
  links?: Array<{ id: string; rel: string }>;
}

/**
 * The statuses amendment may touch — each type's born-pending status, before
 * the user's stamp (REQ-008). Everything past these is binding (or, for
 * sources, preserved evidence) and stays a deliberate human/git act; ready
 * work orders carry the approval stamp, so they are already across the line.
 */
const AMENDABLE: Record<string, string> = {
  requirement: 'draft',
  decision: 'proposed',
  'work-order': 'backlog',
};

const FM_RE = /^---\r?\n[\s\S]*?\r?\n---/;

/** The links block exactly as createDocument serializes it. */
function serializeLinks(links: Array<{ id: string; rel: string }>): string {
  return ['links:', ...links.flatMap((link) => [`  - id: ${link.id}`, `    rel: ${link.rel}`])].join('\n');
}

/** Replace the frontmatter links block, or insert one after `updated:` when
    none exists. An empty list removes the block — links are optional. */
function rewriteLinks(block: string, links: Array<{ id: string; rel: string }>): string {
  const serialized = links.length > 0 ? serializeLinks(links) : null;
  const existing = /^links:[ \t]*\r?\n(?:[ \t]+.*(?:\r?\n|$))*/m.exec(block);
  if (existing !== null) {
    const replacement = serialized === null ? '' : `${serialized}\n`;
    return block.slice(0, existing.index) + replacement + block.slice(existing.index + existing[0].length);
  }
  if (serialized === null) return block;
  return block.replace(/^updated: .*$/m, (line) => `${line}\n${serialized}`);
}

/** The on-disk Receipts section (heading through the next `## ` or EOF),
    or null when the body has none. */
function receiptsSection(body: string): string | null {
  const heading = /^## Receipts[ \t]*$/m.exec(body);
  if (heading === null) return null;
  const rest = body.slice(heading.index + heading[0].length);
  const next = rest.search(/^##\s/m);
  const end = next >= 0 ? heading.index + heading[0].length + next : body.length;
  return body.slice(heading.index, end).trimEnd();
}

export interface AmendResult {
  id: string;
  file: string;
}

/**
 * Revise an unapproved document in place — the iterate half of the triage
 * loop (propose → review → revise), on the same validated path as creation.
 * Amendment never crosses the approval boundary of REQ-008: only documents
 * still in their born-pending status qualify, the tool accepts no status or
 * approval fields, and the write goes through core's guarded save, which
 * refuses id changes, `approved:` edits, and promotions independently. The
 * `updated:` bump rides the same save (DEC-076's local calendar date).
 */
export async function amendDocument(projectRoot: string, input: AmendDocumentInput): Promise<AmendResult> {
  const veriDir = join(projectRoot, 'veri');
  if (!existsSync(veriDir)) throw new Error(`no veri/ directory under ${projectRoot}`);
  if (input.title === undefined && input.body === undefined && input.links === undefined) {
    throw new Error('nothing to amend — pass at least one of title, body, links');
  }

  const { documents } = await loadProject(veriDir);
  const wanted = input.id.toUpperCase();
  const doc = documents.find((candidate) => candidate.id === wanted);
  if (doc === undefined) throw new Error(`no document with id ${wanted}`);

  const pending = AMENDABLE[doc.type];
  if (pending === undefined) {
    throw new Error(
      `${wanted} is a ${doc.type} — amendment covers requirements, decisions, and work orders; ` +
        `${doc.type === 'source' ? 'sources are preserved evidence and never rewritten' : 'other types are edited directly'}`,
    );
  }
  if (doc.status !== pending) {
    throw new Error(
      `refusing to amend ${wanted} — it is ${doc.status}, past the approval boundary (REQ-008). ` +
        `Amendment is for ${pending} documents only; changes to reviewed documents are deliberate human/git acts.`,
    );
  }

  if (input.links !== undefined) {
    const known = new Set(documents.map((candidate) => candidate.id));
    for (const link of input.links) {
      if (!known.has(link.id)) {
        throw new Error(`link target ${link.id} does not exist — the document would fail veri check`);
      }
    }
  }
  if (input.body !== undefined && /^## Receipts[ \t]*$/m.test(input.body)) {
    throw new Error('the body may not contain a Receipts section — receipts are append-only via file_receipt');
  }
  if (input.title !== undefined && input.title.trim() === '') {
    throw new Error('a title is required');
  }

  const path = join(veriDir, doc.file);
  const raw = await readFile(path, 'utf8');
  const fm = FM_RE.exec(raw);
  if (fm === null) throw new Error(`${doc.file} has no frontmatter block`); // unreachable after a clean parse

  let block = fm[0];
  if (input.title !== undefined) {
    block = block.replace(/^title: .*$/m, `title: ${JSON.stringify(input.title.trim())}`);
  }
  if (input.links !== undefined) {
    block = rewriteLinks(block, input.links);
  }

  let body = raw.slice(fm[0].length);
  if (input.body !== undefined) {
    const carried = receiptsSection(body);
    body = `\n\n${input.body.trim()}\n${carried === null ? '' : `\n${carried}\n`}`;
  }

  const next = block + body;
  const outcome = parseDocument(doc.file, next);
  if (outcome.document === undefined || outcome.issues.length > 0) {
    const reason = outcome.issues[0]?.message ?? 'the result does not parse';
    throw new Error(`refusing to amend ${wanted} — the result would fail veri check: ${reason}`);
  }
  // Core's guarded save: `updated:` bump, plus the approval-boundary belt —
  // id immutable, `approved:` untouchable, no promotion (REQ-008).
  await saveDocumentFile(veriDir, doc.file, next);
  return { id: wanted, file: `veri/${doc.file}` };
}
