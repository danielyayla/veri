import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { compareIds, isWithdrawn, loadProject, parseReceipts } from '@verikb/core';
import type { VeriDocument } from '@verikb/core';

/**
 * Receipts as data (REQ-041 item 3, WO-128): the implementation record a
 * work order carries in prose, read back as entries a health sweep or an
 * archaeology walk can correlate with git history without re-parsing
 * markdown. The parsing is core's `parseReceipts` — the same one the
 * receipt-verification advisories run on, so this surface can never
 * disagree with `veri check` about what a receipt claims (DEC-132).
 *
 * What this surface deliberately does not do is check those claims: the
 * server spawns no subprocess and touches no git history (DEC-081), so the
 * SHAs here are what the record says, not what the repository confirms.
 * Verification stays the terminal `veri check` tier.
 */

/** One receipt, with the work order that filed it. */
export interface ReceiptRow {
  /** The work order the receipt belongs to, e.g. WO-126. */
  workOrder: string;
  /** Path relative to the project root, e.g. veri/work-orders/WO-126-… */
  file: string;
  /** YYYY-MM-DD, or null when the receipt names no date. */
  date: string | null;
  /** SHAs the receipt cites, as written — unverified against history. */
  shas: string[];
  /** Path-like tokens from the receipt's files segment. */
  files: string[];
  /** The receipt's trailing summary; empty when it has none. */
  summary: string;
  /** The receipt item verbatim, wrapped lines joined. */
  raw: string;
}

function requireVeriDir(projectRoot: string): string {
  const dir = join(projectRoot, 'veri');
  if (!existsSync(dir)) throw new Error(`no veri/ directory under ${projectRoot}`);
  return dir;
}

function rows(doc: VeriDocument): ReceiptRow[] {
  return parseReceipts(doc.body).map((receipt) => ({
    workOrder: doc.id,
    file: `veri/${doc.file}`,
    date: receipt.date,
    shas: receipt.shas,
    files: receipt.paths,
    summary: receipt.summary,
    raw: receipt.raw,
  }));
}

/**
 * Receipts for one work order, or for the whole corpus when no id is given.
 * Work orders come in `compareIds` order and each one's receipts in the
 * order the document files them, so the corpus-wide answer reads as the
 * record does. A work order with no receipts contributes no rows, and an
 * unknown id — or an id that names something other than a work order —
 * yields the empty set rather than an error: asking what WO-999 shipped is
 * a question with an answer, not a fault.
 *
 * Withdrawn work orders are out of play (DEC-110) and stay out of the
 * corpus-wide sweep, matching `list_documents`; asking for one by id still
 * answers, because naming an id is asking for that document specifically.
 */
export async function getReceipts(projectRoot: string, id?: string): Promise<ReceiptRow[]> {
  const { documents } = await loadProject(requireVeriDir(projectRoot));
  return documents
    .filter((doc) => doc.type === 'work-order')
    .filter((doc) => (id === undefined ? !isWithdrawn(doc) : doc.id === id))
    .sort((a, b) => compareIds(a.id, b.id))
    .flatMap(rows);
}

const list = (values: string[], empty: string): string => (values.length === 0 ? empty : values.join(', '));

/**
 * One receipt per line, summary last so it may contain anything — the
 * enumeration surface's line shape (DEC-131), not JSON. Absent fields say
 * so rather than rendering as a gap that reads like a parse failure.
 */
export function renderReceipts(receipts: ReceiptRow[], id?: string): string {
  if (receipts.length === 0) {
    return id === undefined
      ? 'no receipts — no work order in this knowledge base has filed one'
      : `no receipts for ${id} — it has filed none, or no work order carries that id`;
  }
  const workOrders = new Set(receipts.map((entry) => entry.workOrder)).size;
  const scope = `${receipts.length} receipt${receipts.length === 1 ? '' : 's'} across ${workOrders} work order${workOrders === 1 ? '' : 's'}`;
  const lines = receipts.map(
    (entry) =>
      `${entry.workOrder}  ${entry.date ?? '(no date)'}  ${list(entry.shas, '(no sha)')}  ` +
      `${list(entry.files, '(no files)')}  ${entry.summary === '' ? entry.raw : entry.summary}`,
  );
  return [`${scope} (SHAs as filed — this surface runs no git):`, ...lines].join('\n');
}
