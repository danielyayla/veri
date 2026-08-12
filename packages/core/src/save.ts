import { readFile, writeFile } from 'node:fs/promises';
import { isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The direct-editing write path (REQ-009, WO-022): the buffer is written
 * verbatim except for the `updated:` bump, and the approval boundary of
 * REQ-008 is the one thing a save may never cross. Everything else —
 * including edits `veri check` will flag — saves freely; validity is an
 * indicator, not a gate (DEC-002).
 */

const FM_RE = /^---\r?\n[\s\S]*?\r?\n---/;

/** Statuses a document must leave via `veri approve`, per type (REQ-008). */
const PENDING_STATUS: Record<string, string> = {
  requirement: 'draft',
  decision: 'proposed',
  workflow: 'draft',
};

/** The frontmatter region: the fenced block when present, else the whole
    text — the parse-degraded fallback, so a half-deleted fence can't smuggle
    a guarded line past the checks. */
function fmRegion(raw: string): string {
  return FM_RE.exec(raw)?.[0] ?? raw;
}

function fmValue(raw: string, key: string): string | null {
  const match = new RegExp(`^${key}:[ \\t]*(.*)$`, 'm').exec(fmRegion(raw));
  return match === null ? null : match[1].trim();
}

/**
 * The save-time guard: the reason `next` may not replace `prev`, or null when
 * the edit is allowed. Pure so the UI, tests, and any future caller agree.
 */
export function guardDocumentEdit(prev: string, next: string): string | null {
  const prevId = fmValue(prev, 'id');
  if (prevId !== null && fmValue(next, 'id') !== prevId) {
    return 'id is immutable';
  }
  const prevApproved = fmValue(prev, 'approved');
  if (fmValue(next, 'approved') !== prevApproved) {
    return 'approved is set via veri approve';
  }
  const pending = PENDING_STATUS[fmValue(prev, 'type') ?? ''];
  const prevStatus = fmValue(prev, 'status');
  if (pending !== undefined && prevStatus === pending && fmValue(next, 'status') !== prevStatus) {
    return 'promotion requires approval — use veri approve';
  }
  return null;
}

/** Thrown when a save would cross the approval boundary. */
export class GuardedEditError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = 'GuardedEditError';
  }
}

/** The one silent rewrite a save performs (REQ-009): `updated:` becomes the
    save date. Only the frontmatter block is touched; a file without one (or
    without the line) is returned unchanged — that's a check issue, not ours. */
export function bumpUpdated(text: string, date: string): string {
  const fm = FM_RE.exec(text);
  if (fm === null) return text;
  const block = fm[0].replace(/^updated: .*$/m, `updated: ${date}`);
  return block + text.slice(fm[0].length);
}

export interface SaveResult {
  /** Path relative to the veri/ directory. */
  file: string;
  /** The text actually written (the buffer with the `updated:` bump). */
  text: string;
}

/**
 * Write an edited document buffer to `file` (relative to `veriDir`). Guards
 * compare against the file's current on-disk content; a missing file is a
 * restore (the deleted-while-editing case) and writes without comparison.
 */
export async function saveDocumentFile(
  veriDir: string | URL,
  file: string,
  text: string,
  date: string = new Date().toISOString().slice(0, 10),
): Promise<SaveResult> {
  const root = typeof veriDir === 'string' ? veriDir : fileURLToPath(veriDir);
  if (isAbsolute(file) || file.split(/[\\/]/).includes('..') || !file.endsWith('.md')) {
    throw new Error(`refusing to write outside veri/: ${file}`);
  }
  const path = join(root, file);
  let prev: string | null = null;
  try {
    prev = await readFile(path, 'utf8');
  } catch {
    prev = null;
  }
  if (prev !== null) {
    const reason = guardDocumentEdit(prev, text);
    if (reason !== null) throw new GuardedEditError(reason);
  }
  const next = bumpUpdated(text, date);
  await writeFile(path, next);
  return { file, text: next };
}
