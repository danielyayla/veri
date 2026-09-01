import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadProject } from './load.ts';
import type { LoadResult } from './load.ts';
import { checkProject, maintainerRegistry, tracesToLiveRequirement } from './check.ts';
import { isPending } from './pending.ts';
import { parseDocument } from './parse.ts';
import { localToday } from './dates.ts';
import { INITIAL_STATUS, composeNewDocument, writeNewDocument } from './create.ts';
import type { CreateOptions } from './create.ts';
import type { DocType } from './ids.ts';
import type { Issue, VeriDocument } from './types.ts';

export interface ApproveResult {
  id: string;
  /** Path relative to the veri/ directory. */
  file: string;
  from: string;
  to: string;
  approved: string;
  /** Present when the stamp names its maintainer (DEC-071). */
  approvedBy?: string;
}

const PROMOTION: Record<string, { from: string; to: string }> = {
  requirement: { from: 'draft', to: 'accepted' },
  decision: { from: 'proposed', to: 'active' },
  workflow: { from: 'draft', to: 'accepted' },
  // WO-098: the fourth stamped promotion — dispatch clearance. A started
  // work order (in-progress/done) is past approving, same as superseded.
  'work-order': { from: 'backlog', to: 'ready' },
  // WO-121: product singletons promote like the workflow they mirror.
  product: { from: 'draft', to: 'accepted' },
  // WO-131: methods carry the workflow's lifecycle exactly (DEC-130) —
  // approval is what makes "the user can amend and approve the method"
  // (DEC-125) true, and the emitter writes a shell only once it has been.
  method: { from: 'draft', to: 'accepted' },
};

/**
 * DEC-071's maintainers gate, shared by `veri approve` and the combined
 * file-and-approve act (WO-142, DEC-147): a maintainers list on the workflow
 * doc activates team semantics — the stamp must then name a listed
 * maintainer. No list means solo, and a name (if given) is recorded without
 * validation. `repair` is the command sample the refusal suggests. Returns
 * the trimmed approver, or undefined when none was given.
 */
export function requireListedApprover(
  documents: VeriDocument[],
  approvedBy: string | undefined,
  repair: string,
): string | undefined {
  const maintainers = maintainerRegistry(documents);
  const approver = approvedBy?.trim();
  if (maintainers.length > 0) {
    if (approver === undefined || approver === '') {
      throw new Error(
        `this project declares maintainers — the stamp must name one: ${repair} (maintainers: ${maintainers.join(', ')})`,
      );
    }
    if (!maintainers.includes(approver)) {
      throw new Error(`"${approver}" is not in the workflow's maintainers list (${maintainers.join(', ')})`);
    }
  }
  return approver === undefined || approver === '' ? undefined : approver;
}

/**
 * WO-098's prospective dispatch gates, shared by `veri approve` and the
 * combined act (WO-142): ready means dispatchable, and it must be born
 * check-clean — a requirement link exists, nothing it depends on is still
 * pending, and the work traces to a live requirement (REQ-039, WO-123).
 * Throws the refusal; passing is silent.
 */
export function assertDispatchable(documents: VeriDocument[], doc: VeriDocument): void {
  if (!doc.links.some((link) => link.id.startsWith('REQ-'))) {
    throw new Error(`refusing to ready ${doc.id} — it links no requirement; a dispatchable work order names what it implements`);
  }
  const byId = new Map(documents.map((candidate) => [candidate.id, candidate]));
  for (const link of doc.links) {
    const target = byId.get(link.id);
    if (target !== undefined && isPending(target)) {
      throw new Error(
        `refusing to ready ${doc.id} — it depends on ${target.id}, which is still ${target.status} — approve it first (veri approve ${target.id})`,
      );
    }
  }
  if (!tracesToLiveRequirement(documents, doc)) {
    throw new Error(
      `refusing to ready ${doc.id} — it traces to no live requirement; every requirement it reaches is retired or withdrawn (REQ-039)`,
    );
  }
}

/** The issues that block approving `file` — approve's gate: only issues,
    never advisories (DEC-025), and only the document's own. */
function blockingIssues(load: LoadResult, file: string): Issue[] {
  return checkProject(load).issues.filter((issue) =>
    issue.kind === 'duplicate-id' ? issue.files.includes(file) : issue.file === file,
  );
}

/**
 * The user's approval act per REQ-008: flip a pending document's status and
 * stamp `approved:` with the given date, editing only those frontmatter lines
 * so the rest of the file stays byte-for-byte intact. Refuses documents that
 * have outstanding check issues.
 */
export async function approveDocument(
  veriDir: string | URL,
  id: string,
  date: string = localToday(),
  approvedBy?: string,
): Promise<ApproveResult> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`approval date must be YYYY-MM-DD, got "${date}"`);
  const root = typeof veriDir === 'string' ? veriDir : fileURLToPath(veriDir);
  const load = await loadProject(root);

  const wanted = id.toUpperCase();
  const doc = load.documents.find((candidate) => candidate.id === wanted);
  if (doc === undefined) throw new Error(`no document with id ${wanted}`);

  const approver = requireListedApprover(load.documents, approvedBy, `veri approve ${wanted} --as <name>`);

  const promotion = PROMOTION[doc.type];
  if (promotion === undefined) {
    throw new Error(`${wanted} is a ${doc.type} — only requirements, decisions, workflows, work orders, product documents and methods are approved`);
  }
  // Already-promoted documents may be approved again: a re-approval
  // re-stamps `approved:` in place, ratifying the current text — the remedy
  // WO-045's drift advisories name. Any other status has nothing to approve.
  if (doc.status !== promotion.from && doc.status !== promotion.to) {
    throw new Error(`nothing to approve — ${wanted} is ${doc.status}, not ${promotion.from}`);
  }

  // Only issues block approval — advisories are a separate, non-gating tier (DEC-025).
  const blocking = blockingIssues(load, doc.file);
  if (blocking.length > 0) {
    throw new Error(
      `refusing to approve ${wanted} — fix its check issue(s) first:\n${blocking.map((issue) => `  ${issue.message}`).join('\n')}`,
    );
  }

  // WO-098: the started-work checks exempt backlog, so a backlog work order
  // carries no issue for the filter above to catch — but ready means
  // dispatchable, and it must be born check-clean. Check prospectively.
  if (doc.type === 'work-order') assertDispatchable(load.documents, doc);

  const path = join(root, doc.file);
  const raw = await readFile(path, 'utf8');
  const fm = /^---\r?\n[\s\S]*?\r?\n---/.exec(raw);
  if (fm === null) throw new Error(`${doc.file} has no frontmatter block`); // unreachable after a clean parse
  let block = fm[0];

  block = block.replace(/^status: .*$/m, `status: ${promotion.to}`);
  block = /^approved: /m.test(block)
    ? block.replace(/^approved: .*$/m, `approved: ${date}`)
    : block.replace(/^status: .*$/m, (line) => `${line}\napproved: ${date}`);
  // DEC-071: the approver's name rides directly under the date, by the same
  // line-targeted discipline — one added line, everything else untouched.
  if (approver !== undefined && approver !== '') {
    block = /^approved_by: /m.test(block)
      ? block.replace(/^approved_by: .*$/m, `approved_by: ${approver}`)
      : block.replace(/^approved: .*$/m, (line) => `${line}\napproved_by: ${approver}`);
  }
  block = block.replace(/^updated: .*$/m, `updated: ${date}`);

  const next = block + raw.slice(fm[0].length);
  const outcome = parseDocument(doc.file, next);
  if (outcome.document === undefined) {
    throw new Error(`internal error — the approval edit would corrupt ${doc.file}: ${outcome.issues[0]?.message}`);
  }
  await writeFile(path, next);
  return {
    id: wanted,
    file: doc.file,
    from: doc.status,
    to: promotion.to,
    approved: date,
    ...(approver !== undefined && approver !== '' ? { approvedBy: approver } : {}),
  };
}

export interface CreateApprovedResult {
  id: string;
  /** Path relative to the veri/ directory. */
  file: string;
  text: string;
  from: string;
  to: string;
  approved: string;
  /** Present when the stamp names its maintainer (DEC-071). */
  approvedBy?: string;
}

/**
 * The combined file-and-approve act (WO-142, DEC-147): when the user is the
 * author, the filing carries the stamp — one command, one commit, one write.
 * Runs exactly the gates `approveDocument` runs today (maintainers validated,
 * issues block, work orders need a live requirement trace), but *between*
 * composition and the write: the issues gate runs on a synthetic load with
 * the parsed composed text appended, which is faithful because loadProject
 * parses every file through the same parseDocument. A refusal therefore
 * leaves nothing on disk — no pending file, no rollback path.
 *
 * This is a user surface (`veri new --approve`), never an agent one: the MCP
 * filing tools call `createDocument` and cannot reach this (REQ-008).
 */
export async function createApprovedDocument(
  veriDir: string | URL,
  type: DocType,
  title: string,
  options: CreateOptions & { approvedBy?: string } = {},
): Promise<CreateApprovedResult> {
  const date = options.date ?? localToday();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`approval date must be YYYY-MM-DD, got "${date}"`);
  const root = typeof veriDir === 'string' ? veriDir : fileURLToPath(veriDir);
  const load = await loadProject(root);

  const approver = requireListedApprover(
    load.documents,
    options.approvedBy,
    `veri new ${type} "<title>" --approve --as <name>`,
  );

  const promotion = PROMOTION[type];
  if (promotion === undefined) {
    // Today this is only `source`: born `imported` and already in play, it
    // has no pending state and takes no stamp (REQ-008's gate covers the
    // types with one). The CLI answers the flag with this fact instead of
    // filing anything half-approved.
    throw new Error(
      `a ${type} is born in play and takes no approval stamp — only requirements, decisions, workflows, work orders, product documents and methods are approved`,
    );
  }

  const { approvedBy: _approvedBy, ...createOptions } = options;
  const composed = await composeNewDocument(root, load.documents, type, title, createOptions, {
    status: promotion.to,
    approved: date,
    ...(approver !== undefined ? { approvedBy: approver } : {}),
  });

  const outcome = parseDocument(composed.file, composed.text);
  if (outcome.document === undefined) {
    throw new Error(`internal error — the composed document would corrupt ${composed.file}: ${outcome.issues[0]?.message}`);
  }
  const doc = outcome.document;

  // The same prospective dispatch gates approve runs (WO-098, REQ-039).
  if (doc.type === 'work-order') assertDispatchable(load.documents, doc);

  // The same issues gate approve runs (DEC-025: only issues block), on the
  // project as it would be the moment after the write.
  const blocking = blockingIssues({ ...load, documents: [...load.documents, doc] }, doc.file);
  if (blocking.length > 0) {
    throw new Error(
      `refusing to approve ${doc.id} — the document would carry check issue(s):\n${blocking.map((issue) => `  ${issue.message}`).join('\n')}`,
    );
  }

  writeNewDocument(root, composed);
  return {
    id: composed.id,
    file: composed.file,
    text: composed.text,
    from: INITIAL_STATUS[type],
    to: promotion.to,
    approved: date,
    ...(approver !== undefined ? { approvedBy: approver } : {}),
  };
}
