import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { loadProject } from '@veri/core';
import type { VeriDocument } from '@veri/core';

/** Statuses the UI may write, per the vocabularies in CLAUDE.md / core's schema. */
const WRITABLE_STATUSES: Record<string, readonly string[]> = {
  requirement: ['draft', 'accepted', 'retired'],
  decision: ['active', 'superseded'],
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
