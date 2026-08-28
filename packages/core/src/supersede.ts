import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadProject } from './load.ts';
import { parseDocument } from './parse.ts';
import { localToday } from './dates.ts';
import type { VeriDocument } from './types.ts';

/**
 * Supersession (WO-138): the backward half of a reversal. The new decision
 * is filed forward with a `supersedes` link; this is the act that retires
 * the old one — `status: superseded` plus the `superseded_by:` the schema
 * requires alongside it, written together so the pair can never be half
 * applied.
 *
 * It is not a promotion and needs no stamp of its own (the DEC-110 posture
 * for withdrawal), because the authority moved when the user approved the
 * successor: an active successor is required, so every supersession stands
 * on a human stamp that already exists (DEC-140, proposed). Retiring a live
 * decision on the word of a proposed one would be exactly the downstream
 * power REQ-008 denies unapproved documents.
 */

const FM_RE = /^---\r?\n[\s\S]*?\r?\n---/;

export const SUPERSEDED_STATUS = 'superseded';

export interface SupersedeResult {
  id: string;
  /** Path relative to the veri/ directory. */
  file: string;
  /** The status the decision left. */
  from: string;
  /** The decision that now governs. */
  successor: string;
}

function findDocument(documents: VeriDocument[], id: string): VeriDocument {
  const wanted = id.toUpperCase();
  const doc = documents.find((candidate) => candidate.id === wanted);
  if (doc === undefined) throw new Error(`no document with id ${wanted}`);
  return doc;
}

/**
 * Why this pair may not be superseded, or null when it may proceed. Pure, so
 * the CLI, the MCP server, and the app give the same answer — and the same
 * remedy — without touching the disk twice (the `deleteRefusal` pattern).
 */
export function supersedeRefusal(doc: VeriDocument, successor: VeriDocument): string | null {
  if (doc.type !== 'decision') {
    return `${doc.id} is a ${doc.type} — supersession covers decisions; a requirement leaves play via retire or veri withdraw ${doc.id}`;
  }
  if (doc.id === successor.id) return `${doc.id} cannot supersede itself`;
  if (doc.status !== 'active') {
    const detail =
      doc.status === SUPERSEDED_STATUS
        ? `it is already superseded${doc.supersededBy === undefined ? '' : ` by ${doc.supersededBy}`}`
        : doc.status === 'withdrawn'
          ? 'it is withdrawn — out of play, with nothing left to retire'
          : `it is ${doc.status} — a decision that never bound cannot be reversed; withdraw it instead: veri withdraw ${doc.id}`;
    return `${doc.id} is not active: ${detail}`;
  }
  if (successor.type !== 'decision') {
    return `${successor.id} is a ${successor.type} — only a decision can succeed a decision`;
  }
  if (successor.status !== 'active') {
    // REQ-008: an unapproved document has no downstream power, and retiring
    // a live decision is downstream power. Approving the successor is the
    // human act this flip then merely records.
    return `${successor.id} is ${successor.status}, not active — approve it first (veri approve ${successor.id}), so the fork is never left with the old decision retired and the new one not yet binding`;
  }
  return null;
}

/**
 * Flip an active decision to `superseded`, naming its successor. Edits only
 * the `status:`, `superseded_by:` and `updated:` frontmatter lines, leaving
 * the rest of the file byte-for-byte intact — the same line-targeted
 * discipline as approve, start, and withdraw.
 */
export async function supersedeDecision(
  veriDir: string | URL,
  id: string,
  successorId: string,
  date: string = localToday(),
): Promise<SupersedeResult> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`supersede date must be YYYY-MM-DD, got "${date}"`);
  const root = typeof veriDir === 'string' ? veriDir : fileURLToPath(veriDir);
  const { documents } = await loadProject(root);
  const doc = findDocument(documents, id);
  const successor = findDocument(documents, successorId);

  const refusal = supersedeRefusal(doc, successor);
  if (refusal !== null) throw new Error(`refusing to supersede — ${refusal}`);

  const path = join(root, doc.file);
  const raw = await readFile(path, 'utf8');
  const fm = FM_RE.exec(raw);
  if (fm === null) throw new Error(`${doc.file} has no frontmatter block`); // unreachable after a clean parse

  // The successor line rides directly under `status:`, the position the
  // corpus already reads in; an existing one is replaced rather than doubled.
  const block = fm[0]
    .replace(/^superseded_by: .*\r?\n/m, '')
    .replace(/^status: .*$/m, `status: ${SUPERSEDED_STATUS}\nsuperseded_by: ${successor.id}`)
    .replace(/^updated: .*$/m, `updated: ${date}`);
  const next = block + raw.slice(fm[0].length);

  const outcome = parseDocument(doc.file, next);
  if (outcome.document === undefined) {
    throw new Error(`internal error — the supersede edit would corrupt ${doc.file}: ${outcome.issues[0]?.message}`);
  }
  await writeFile(path, next);
  return { id: doc.id, file: doc.file, from: doc.status, successor: successor.id };
}
