import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadProject } from './load.ts';
import { checkDesignGate, checkProject } from './check.ts';
import { assertDispatchable, requireListedApprover } from './approve.ts';
import { parseDocument } from './parse.ts';
import { localToday } from './dates.ts';

export interface DispatchResult {
  id: string;
  /** Path relative to the veri/ directory. */
  file: string;
  /** The effective stamp date — newly written, or the one already carried. */
  approved: string;
  /** Present when the stamp names its maintainer (DEC-071). */
  approvedBy?: string;
  /** False when the document already carried a stamp, which dispatch
      preserves rather than re-dates — the clearance was already on record. */
  stamped: boolean;
  claimedBy: string;
  claimedAt: string;
}

/**
 * The dispatch transition (DEC-143, WO-143): approval and dispatch are one
 * gesture. Flip a backlog work order to in-progress, writing the approval
 * stamp (`approved:`/`approved_by:`) and the claim (`claimed_by`/
 * `claimed_at`) in one line-targeted edit — the stamp and the claim are the
 * same act, performed by the user. This is the only sanctioned door into
 * in-progress, so execution is always clearance being exercised, and it
 * refuses a work order another session already holds.
 *
 * It refuses prospectively everything `veri approve` refused for the retired
 * ready state (DEC-096's invariant, re-anchored): outstanding check issues,
 * no requirement link, pending links, no live-requirement trace (REQ-039),
 * and an unmet design gate — so in-progress is born check-clean.
 *
 * A work order that already carries an `approved:` stamp (the migrated ready
 * queue's transitional state) keeps it: dispatch writes only the claim, and
 * the recorded judgment date stands rather than being re-dated. Claims are
 * declarations in the knowledge base, never OS-level locks: a crashed
 * session leaves a claim behind, and the stale-claim advisory surfaces it.
 */
export async function dispatchWorkOrder(
  veriDir: string | URL,
  id: string,
  claimedBy: string,
  options: { date?: string; approvedBy?: string } = {},
): Promise<DispatchResult> {
  const date = options.date ?? localToday();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`dispatch date must be YYYY-MM-DD, got "${date}"`);
  const claimant = claimedBy.trim();
  if (claimant === '') throw new Error('a claim names its holder — pass a session or agent identity');
  const root = typeof veriDir === 'string' ? veriDir : fileURLToPath(veriDir);
  const load = await loadProject(root);

  const wanted = id.toUpperCase();
  const doc = load.documents.find((candidate) => candidate.id === wanted);
  if (doc === undefined) throw new Error(`no document with id ${wanted}`);
  if (doc.type !== 'work-order') throw new Error(`${wanted} is a ${doc.type} — only work orders are dispatched`);

  if (doc.status === 'in-progress') {
    const holder = doc.claimedBy === undefined ? 'an unrecorded session' : `"${doc.claimedBy}" since ${doc.claimedAt}`;
    throw new Error(`refusing to dispatch ${wanted} — it is already in-progress, claimed by ${holder}`);
  }
  if (doc.status === 'done') throw new Error(`nothing to dispatch — ${wanted} is done`);
  if (doc.status !== 'backlog') {
    throw new Error(`refusing to dispatch ${wanted} — it is ${doc.status}, and only backlog work orders are dispatched`);
  }

  // DEC-071's maintainers gate, exactly as approve runs it: the stamp half
  // of the gesture must name a listed maintainer in a maintainers project.
  const approver = requireListedApprover(
    load.documents,
    options.approvedBy,
    `veri dispatch ${wanted} --as <session> --by <name>`,
  );

  // Same bar as approving (REQ-008's gate discipline): a work order whose
  // file carries check issues does not dispatch.
  const blocking = checkProject(load).issues.filter((issue) =>
    issue.kind === 'duplicate-id' ? issue.files.includes(doc.file) : issue.file === doc.file,
  );
  if (blocking.length > 0) {
    throw new Error(
      `refusing to dispatch ${wanted} — fix its check issue(s) first:\n${blocking.map((issue) => `  ${issue.message}`).join('\n')}`,
    );
  }

  // The prospective gates the backlog exemptions would otherwise hide
  // (WO-098, REQ-039): requirement link, pending links, live trace.
  assertDispatchable(load.documents, doc);

  // The design gate, checked prospectively (DEC-143): the started-work rule
  // exempts backlog, so run it against the document as it will be the moment
  // after the flip — an unmet gate blocks the gesture instead of being born
  // as an issue.
  const flipped = load.documents.map((candidate) =>
    candidate === doc ? { ...doc, status: 'in-progress' } : candidate,
  );
  const gate = checkDesignGate(flipped).find((issue) => 'file' in issue && issue.file === doc.file);
  if (gate !== undefined) {
    throw new Error(`refusing to dispatch ${wanted} — ${gate.message}`);
  }

  const path = join(root, doc.file);
  const raw = await readFile(path, 'utf8');
  const fm = /^---\r?\n[\s\S]*?\r?\n---/.exec(raw);
  if (fm === null) throw new Error(`${doc.file} has no frontmatter block`); // unreachable after a clean parse
  let block = fm[0];

  block = block.replace(/^status: .*$/m, 'status: in-progress');
  // The stamp: written only when none exists — an existing `approved:` is a
  // judgment already on record, preserved rather than re-dated. The approver
  // rides under the date by the same line-targeted discipline (DEC-071).
  const stamped = !/^approved: /m.test(block);
  if (stamped) {
    block = block.replace(/^status: .*$/m, (line) => `${line}\napproved: ${date}`);
  }
  // The claim rides under the stamp it accompanies — leftover fields (hand
  // edits) are overwritten. Inserted before the approver so `approved_by:`
  // can slot directly under the date it attributes (DEC-071's order).
  block = /^claimed_by: /m.test(block)
    ? block.replace(/^claimed_by: .*$/m, `claimed_by: ${claimant}`)
    : block.replace(/^approved: .*$/m, (line) => `${line}\nclaimed_by: ${claimant}`);
  block = /^claimed_at: /m.test(block)
    ? block.replace(/^claimed_at: .*$/m, `claimed_at: ${date}`)
    : block.replace(/^claimed_by: .*$/m, (line) => `${line}\nclaimed_at: ${date}`);
  if (approver !== undefined && approver !== '') {
    block = /^approved_by: /m.test(block)
      ? block.replace(/^approved_by: .*$/m, `approved_by: ${approver}`)
      : block.replace(/^approved: .*$/m, (line) => `${line}\napproved_by: ${approver}`);
  }
  block = block.replace(/^updated: .*$/m, `updated: ${date}`);

  const next = block + raw.slice(fm[0].length);
  const outcome = parseDocument(doc.file, next);
  if (outcome.document === undefined) {
    throw new Error(`internal error — the dispatch edit would corrupt ${doc.file}: ${outcome.issues[0]?.message}`);
  }
  await writeFile(path, next);
  return {
    id: wanted,
    file: doc.file,
    approved: stamped ? date : doc.approved!,
    ...(approver !== undefined && approver !== '' ? { approvedBy: approver } : {}),
    stamped,
    claimedBy: claimant,
    claimedAt: date,
  };
}
