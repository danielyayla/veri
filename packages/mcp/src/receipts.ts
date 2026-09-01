import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { OUTCOME_OF_REL, compareIds, isWithdrawn, loadProject, parseReceipts } from '@verikb/core';
import type { VeriDocument } from '@verikb/core';

/**
 * Receipts as data (REQ-041 item 3, WO-128): the pointers a work order
 * carries into git (DEC-142) — date, commit or PR ref, one sentence — read
 * back as entries a health sweep or an archaeology walk can correlate with
 * history without re-parsing markdown. The parsing is core's
 * `parseReceipts` — the same one the receipt-commit-missing advisory runs
 * on, so this surface can never disagree with `veri check` about what a
 * receipt claims (DEC-132).
 *
 * What this surface deliberately does not do is check that claim: the
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
  /** The receipt's trailing summary; empty when it has none. */
  summary: string;
  /** The receipt item verbatim, wrapped lines joined. */
  raw: string;
  /** Sources reporting on this work order's shipped change — inbound
      outcome-of links (REQ-033, WO-154), non-withdrawn, in id order.
      What a receipt cannot answer, named beside it: the receipt says what
      shipped, these say what reality reported back. */
  outcomeSources: string[];
}

function requireVeriDir(projectRoot: string): string {
  const dir = join(projectRoot, 'veri');
  if (!existsSync(dir)) throw new Error(`no veri/ directory under ${projectRoot}`);
  return dir;
}

function rows(doc: VeriDocument, outcomeSources: string[]): ReceiptRow[] {
  return parseReceipts(doc.body).map((receipt) => ({
    workOrder: doc.id,
    file: `veri/${doc.file}`,
    date: receipt.date,
    shas: receipt.shas,
    summary: receipt.summary,
    raw: receipt.raw,
    outcomeSources,
  }));
}

/** Which sources report back on which work order: inbound outcome-of edges
    (REQ-033), withdrawn sources out of play (DEC-110), ids deduplicated
    and sorted. Keyed by work-order id. */
function outcomeSourcesByWorkOrder(documents: VeriDocument[]): Map<string, string[]> {
  const reported = new Map<string, string[]>();
  for (const doc of documents) {
    if (doc.type !== 'source' || isWithdrawn(doc)) continue;
    for (const link of doc.links) {
      if (link.rel !== OUTCOME_OF_REL) continue;
      const ids = reported.get(link.id) ?? [];
      if (!ids.includes(doc.id)) ids.push(doc.id);
      reported.set(link.id, ids);
    }
  }
  for (const ids of reported.values()) ids.sort(compareIds);
  return reported;
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
  const reported = outcomeSourcesByWorkOrder(documents);
  return documents
    .filter((doc) => doc.type === 'work-order')
    .filter((doc) => (id === undefined ? !isWithdrawn(doc) : doc.id === id))
    .sort((a, b) => compareIds(a.id, b.id))
    .flatMap((doc) => rows(doc, reported.get(doc.id) ?? []));
}

const list = (values: string[], empty: string): string => (values.length === 0 ? empty : values.join(', '));

/**
 * One receipt per line, summary last so it may contain anything — the
 * enumeration surface's line shape (DEC-131), not JSON. Absent fields say
 * so rather than rendering as a gap that reads like a parse failure. A work
 * order whose shipped change some source reported back on (REQ-033,
 * WO-154) closes its run of lines with one naming that outcome evidence —
 * the question the receipts themselves cannot answer.
 */
export function renderReceipts(receipts: ReceiptRow[], id?: string): string {
  if (receipts.length === 0) {
    return id === undefined
      ? 'no receipts — no work order in this knowledge base has filed one'
      : `no receipts for ${id} — it has filed none, or no work order carries that id`;
  }
  const workOrders = new Set(receipts.map((entry) => entry.workOrder)).size;
  const scope = `${receipts.length} receipt${receipts.length === 1 ? '' : 's'} across ${workOrders} work order${workOrders === 1 ? '' : 's'}`;
  const lines: string[] = [];
  for (const [at, entry] of receipts.entries()) {
    lines.push(
      `${entry.workOrder}  ${entry.date ?? '(no date)'}  ${list(entry.shas, '(no sha)')}  ` +
        `${entry.summary === '' ? entry.raw : entry.summary}`,
    );
    const next = receipts[at + 1];
    if (entry.outcomeSources.length > 0 && (next === undefined || next.workOrder !== entry.workOrder)) {
      lines.push(`${entry.workOrder}  outcome evidence: ${entry.outcomeSources.join(', ')} — what shipped here reported back`);
    }
  }
  return [`${scope} (SHAs as filed — this surface runs no git):`, ...lines].join('\n');
}
