import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadProject } from './load.ts';
import { checkProject, maintainerRegistry } from './check.ts';
import { parseDocument } from './parse.ts';
import { localToday } from './dates.ts';

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
};

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

  // DEC-071: a maintainers list on the workflow doc activates team
  // semantics — the stamp must then name a listed maintainer. No list means
  // solo, and a name (if given) is recorded without validation.
  const maintainers = maintainerRegistry(load.documents);
  const approver = approvedBy?.trim();
  if (maintainers.length > 0) {
    if (approver === undefined || approver === '') {
      throw new Error(
        `this project declares maintainers — the stamp must name one: veri approve ${wanted} --as <name> (maintainers: ${maintainers.join(', ')})`,
      );
    }
    if (!maintainers.includes(approver)) {
      throw new Error(`"${approver}" is not in the workflow's maintainers list (${maintainers.join(', ')})`);
    }
  }

  const promotion = PROMOTION[doc.type];
  if (promotion === undefined) {
    throw new Error(`${wanted} is a ${doc.type} — only requirements, decisions and workflows are approved`);
  }
  // Already-promoted documents may be approved again: a re-approval
  // re-stamps `approved:` in place, ratifying the current text — the remedy
  // WO-045's drift advisories name. Any other status has nothing to approve.
  if (doc.status !== promotion.from && doc.status !== promotion.to) {
    throw new Error(`nothing to approve — ${wanted} is ${doc.status}, not ${promotion.from}`);
  }

  // Only issues block approval — advisories are a separate, non-gating tier (DEC-025).
  const blocking = checkProject(load).issues.filter((issue) =>
    issue.kind === 'duplicate-id' ? issue.files.includes(doc.file) : issue.file === doc.file,
  );
  if (blocking.length > 0) {
    throw new Error(
      `refusing to approve ${wanted} — fix its check issue(s) first:\n${blocking.map((issue) => `  ${issue.message}`).join('\n')}`,
    );
  }

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
