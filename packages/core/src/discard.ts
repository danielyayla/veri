import { readFile, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadProject } from './load.ts';
import { parseDocument } from './parse.ts';
import { localToday } from './dates.ts';
import type { VeriDocument } from './types.ts';

/**
 * The two ways a document leaves play (DEC-110), and they are not the same
 * verb.
 *
 * `withdrawDocument` is the primary one: a status flip to `withdrawn`, the
 * terminal state every type carries. The file stays, the id stays issued,
 * and every inbound [[ID]] link keeps resolving — the record that a path was
 * considered and abandoned is itself project knowledge. Withdrawing is not a
 * promotion, so it needs no `approved:` stamp and is not the user's act alone
 * (REQ-008 gates authority, not abandonment).
 *
 * `deleteDocument` is the escape hatch for a document that never meant
 * anything: a mistyped `veri new`, a scratch file. It removes the file, and
 * refuses unless nothing is lost by doing so — never approved, and nothing
 * references it. The id is not recovered: `veri/ids` stays a high-water floor
 * (DEC-037), so a deleted DEC-112 leaves a permanent hole rather than a
 * reused id.
 */

const FM_RE = /^---\r?\n[\s\S]*?\r?\n---/;

/** The status a withdrawn document lands in — terminal for every type. */
export const WITHDRAWN_STATUS = 'withdrawn';

/** Types that can be withdrawn. The workflow document is the project's
    operating manual, not a proposal, and has no abandoned state (DEC-110
    names four types). */
const WITHDRAWABLE = new Set(['requirement', 'decision', 'work-order', 'source']);

export interface WithdrawResult {
  id: string;
  /** Path relative to the veri/ directory. */
  file: string;
  from: string;
}

export interface DeleteResult {
  id: string;
  /** Path relative to the veri/ directory. */
  file: string;
}

/** Why a hard delete is refused, or null when it may proceed. Pure, so the
    CLI, the MCP server, and any future caller give the same answer without
    touching the disk twice. */
export function deleteRefusal(doc: VeriDocument, documents: VeriDocument[]): string | null {
  if (doc.approved !== undefined) {
    return `${doc.id} was approved ${doc.approved} — an approved document is project history, not a mistake to erase. Withdraw it instead: veri withdraw ${doc.id}`;
  }
  const referrers = documents
    .filter((other) => other.id !== doc.id)
    .filter(
      (other) =>
        other.links.some((link) => link.id === doc.id) ||
        other.inlineRefs.includes(doc.id) ||
        other.supersededBy === doc.id,
    )
    .map((other) => other.id)
    .sort();
  if (referrers.length > 0) {
    return `${referrers.join(', ')} ${referrers.length === 1 ? 'references' : 'reference'} ${doc.id} — deleting it would strand ${referrers.length === 1 ? 'that link' : 'those links'}. Withdraw it instead: veri withdraw ${doc.id}`;
  }
  return null;
}

function findDocument(documents: VeriDocument[], id: string): VeriDocument {
  const wanted = id.toUpperCase();
  const doc = documents.find((candidate) => candidate.id === wanted);
  if (doc === undefined) throw new Error(`no document with id ${wanted}`);
  return doc;
}

/**
 * Flip a document to `withdrawn`, editing only the `status:` and `updated:`
 * frontmatter lines so the rest of the file stays byte-for-byte intact — the
 * same line-targeted discipline as approve and start.
 */
export async function withdrawDocument(
  veriDir: string | URL,
  id: string,
  date: string = localToday(),
): Promise<WithdrawResult> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`withdraw date must be YYYY-MM-DD, got "${date}"`);
  const root = typeof veriDir === 'string' ? veriDir : fileURLToPath(veriDir);
  const { documents } = await loadProject(root);
  const doc = findDocument(documents, id);

  if (!WITHDRAWABLE.has(doc.type)) {
    throw new Error(`${doc.id} is a ${doc.type} — withdrawal covers requirements, decisions, work orders, and sources`);
  }
  if (doc.status === WITHDRAWN_STATUS) throw new Error(`${doc.id} is already withdrawn`);

  const path = join(root, doc.file);
  const raw = await readFile(path, 'utf8');
  const fm = FM_RE.exec(raw);
  if (fm === null) throw new Error(`${doc.file} has no frontmatter block`); // unreachable after a clean parse

  const block = fm[0]
    .replace(/^status: .*$/m, `status: ${WITHDRAWN_STATUS}`)
    .replace(/^updated: .*$/m, `updated: ${date}`);
  const next = block + raw.slice(fm[0].length);

  const outcome = parseDocument(doc.file, next);
  if (outcome.document === undefined) {
    throw new Error(`internal error — the withdraw edit would corrupt ${doc.file}: ${outcome.issues[0]?.message}`);
  }
  await writeFile(path, next);
  return { id: doc.id, file: doc.file, from: doc.status };
}

/**
 * Remove a document's file. Refuses anything approved or referenced — see
 * `deleteRefusal` for the two conditions and the wording the surfaces print.
 */
export async function deleteDocument(veriDir: string | URL, id: string): Promise<DeleteResult> {
  const root = typeof veriDir === 'string' ? veriDir : fileURLToPath(veriDir);
  const { documents } = await loadProject(root);
  const doc = findDocument(documents, id);

  const refusal = deleteRefusal(doc, documents);
  if (refusal !== null) throw new Error(`refusing to delete — ${refusal}`);

  await unlink(join(root, doc.file));
  return { id: doc.id, file: doc.file };
}
