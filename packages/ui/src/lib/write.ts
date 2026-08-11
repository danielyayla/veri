import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { approveDocument, loadProject } from '@veri/core';
import type { ApproveResult, VeriDocument } from '@veri/core';

/** Statuses the UI may write, per the vocabularies in CLAUDE.md / core's schema. */
const WRITABLE_STATUSES: Record<string, readonly string[]> = {
  requirement: ['draft', 'accepted', 'retired'],
  decision: ['proposed', 'active', 'superseded'],
  'work-order': ['backlog', 'in-progress', 'done'],
  source: ['imported'],
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

async function findDoc(projectRoot: string, id: string): Promise<{ doc: VeriDocument; path: string }> {
  const veriDir = join(projectRoot, 'veri');
  const { documents } = await loadProject(veriDir);
  const doc = documents.find((d) => d.id === id);
  if (doc === undefined) throw new Error(`no document with id ${id}`);
  return { doc, path: join(veriDir, doc.file) };
}

/**
 * Change only the `status:` and `updated:` frontmatter lines — the file diff
 * must show nothing else (WO-005 acceptance test).
 */
export async function setStatus(projectRoot: string, id: string, status: string): Promise<void> {
  const { doc, path } = await findDoc(projectRoot, id);
  const allowed = WRITABLE_STATUSES[doc.type] ?? [];
  if (!allowed.includes(status)) {
    throw new Error(`"${status}" is not a valid ${doc.type} status (expected ${allowed.join(' | ')})`);
  }
  const raw = await readFile(path, 'utf8');
  const updated = raw.replace(/^status: .*$/m, `status: ${status}`).replace(/^updated: .*$/m, `updated: ${today()}`);
  await writeFile(path, updated);
}

const NOTES_HEADING_RE = /^## Notes[ \t]*$/m;

/**
 * Append a dated note under the document's "## Notes" section (created at the
 * end of the body when missing). Notes may carry [[ID]] wiki-links; core picks
 * them up as inline refs on the next load.
 */
export async function appendNote(projectRoot: string, id: string, note: string): Promise<void> {
  const text = note.trim();
  if (text === '') throw new Error('note is empty');
  const { path } = await findDoc(projectRoot, id);
  const raw = await readFile(path, 'utf8');
  const line = `- ${today()} — ${text}`;

  let withNote: string;
  const heading = NOTES_HEADING_RE.exec(raw);
  if (heading === null) {
    withNote = `${raw.trimEnd()}\n\n## Notes\n\n${line}\n`;
  } else {
    const afterHeading = heading.index + heading[0].length;
    const rest = raw.slice(afterHeading);
    const nextHeading = rest.search(/^##\s/m);
    const sectionEnd = nextHeading >= 0 ? afterHeading + nextHeading : raw.length;
    const existing = raw.slice(afterHeading, sectionEnd).trim();
    const before = raw.slice(0, afterHeading);
    const after = raw.slice(sectionEnd);
    const section = `\n\n${existing === '' ? '' : `${existing}\n`}${line}\n`;
    withNote = `${before}${section}${after === '' ? '' : `\n${after}`}`;
  }
  await writeFile(path, withNote.replace(/^updated: .*$/m, `updated: ${today()}`));
}

/**
 * The user's approval act (REQ-008), shared with the CLI via core: flip a
 * pending doc's status and stamp `approved:` — exactly three frontmatter
 * lines (DEC-015). Core refuses docs with outstanding check issues.
 */
export async function approveDoc(projectRoot: string, id: string): Promise<ApproveResult> {
  return approveDocument(join(projectRoot, 'veri'), id);
}

const REVIEW_HEADING_RE = /^## Review notes[ \t]*$/m;

/**
 * Return a pending document with review feedback (REQ-008): a dated entry
 * under "## Review notes", so the note reaches agents through normal context
 * packages. The doc keeps its pending status and stays in the queue.
 */
export async function appendReviewNote(projectRoot: string, id: string, note: string): Promise<void> {
  const text = note.trim();
  if (text === '') throw new Error('review note is empty');
  const { doc, path } = await findDoc(projectRoot, id);
  const pending =
    (doc.type === 'requirement' && doc.status === 'draft') || (doc.type === 'decision' && doc.status === 'proposed');
  if (!pending) throw new Error(`${id} is ${doc.status} — review notes are for pending documents`);
  const raw = await readFile(path, 'utf8');
  const line = `- ${today()} (review): ${text}`;

  let withNote: string;
  const heading = REVIEW_HEADING_RE.exec(raw);
  if (heading === null) {
    withNote = `${raw.trimEnd()}\n\n## Review notes\n\n${line}\n`;
  } else {
    const afterHeading = heading.index + heading[0].length;
    const rest = raw.slice(afterHeading);
    const nextHeading = rest.search(/^##\s/m);
    const sectionEnd = nextHeading >= 0 ? afterHeading + nextHeading : raw.length;
    const existing = raw.slice(afterHeading, sectionEnd).trim();
    const before = raw.slice(0, afterHeading);
    const after = raw.slice(sectionEnd);
    const section = `\n\n${existing === '' ? '' : `${existing}\n`}${line}\n`;
    withNote = `${before}${section}${after === '' ? '' : `\n${after}`}`;
  }
  await writeFile(path, withNote.replace(/^updated: .*$/m, `updated: ${today()}`));
}
