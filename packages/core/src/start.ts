import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadProject } from './load.ts';
import { checkProject } from './check.ts';
import { parseDocument } from './parse.ts';
import { localToday } from './dates.ts';

export interface StartResult {
  id: string;
  /** Path relative to the veri/ directory. */
  file: string;
  claimedBy: string;
  claimedAt: string;
}

/**
 * The start transition (WO-099): flip a ready work order to in-progress and
 * record the claim — who holds it (`claimed_by`, free-text session or agent
 * identity) and since when (`claimed_at`, the local calendar date, DEC-076).
 * This is the one sanctioned door into in-progress: it opens only from
 * `ready`, so execution always spends a dispatch clearance the user stamped
 * (WO-098), and it refuses a work order another session already holds — the
 * concurrent-collision guard claims exist for. Claims are declarations in
 * the knowledge base, never OS-level locks: a crashed session leaves a claim
 * behind, and the stale-claim advisory surfaces it.
 */
export async function startWorkOrder(
  veriDir: string | URL,
  id: string,
  claimedBy: string,
  date: string = localToday(),
): Promise<StartResult> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`claim date must be YYYY-MM-DD, got "${date}"`);
  const claimant = claimedBy.trim();
  if (claimant === '') throw new Error('a claim names its holder — pass a session or agent identity');
  const root = typeof veriDir === 'string' ? veriDir : fileURLToPath(veriDir);
  const load = await loadProject(root);

  const wanted = id.toUpperCase();
  const doc = load.documents.find((candidate) => candidate.id === wanted);
  if (doc === undefined) throw new Error(`no document with id ${wanted}`);
  if (doc.type !== 'work-order') throw new Error(`${wanted} is a ${doc.type} — only work orders start`);

  if (doc.status === 'in-progress') {
    const holder = doc.claimedBy === undefined ? 'an unrecorded session' : `"${doc.claimedBy}" since ${doc.claimedAt}`;
    throw new Error(`refusing to start ${wanted} — it is already in-progress, claimed by ${holder}`);
  }
  if (doc.status === 'done') throw new Error(`nothing to start — ${wanted} is done`);
  if (doc.status !== 'ready') {
    throw new Error(
      `refusing to start ${wanted} — it is ${doc.status}, and only cleared work starts: the user stamps it ready first (veri approve ${wanted})`,
    );
  }

  // Same bar as approving (REQ-008's gate discipline): a work order whose
  // file has grown check issues since its clearance does not start.
  const blocking = checkProject(load).issues.filter((issue) =>
    issue.kind === 'duplicate-id' ? issue.files.includes(doc.file) : issue.file === doc.file,
  );
  if (blocking.length > 0) {
    throw new Error(
      `refusing to start ${wanted} — fix its check issue(s) first:\n${blocking.map((issue) => `  ${issue.message}`).join('\n')}`,
    );
  }

  const path = join(root, doc.file);
  const raw = await readFile(path, 'utf8');
  const fm = /^---\r?\n[\s\S]*?\r?\n---/.exec(raw);
  if (fm === null) throw new Error(`${doc.file} has no frontmatter block`); // unreachable after a clean parse
  let block = fm[0];

  block = block.replace(/^status: .*$/m, 'status: in-progress');
  // The claim rides directly under the status it explains, by approve.ts's
  // line-targeted discipline — leftover fields (hand edits) are overwritten.
  block = /^claimed_by: /m.test(block)
    ? block.replace(/^claimed_by: .*$/m, `claimed_by: ${claimant}`)
    : block.replace(/^status: .*$/m, (line) => `${line}\nclaimed_by: ${claimant}`);
  block = /^claimed_at: /m.test(block)
    ? block.replace(/^claimed_at: .*$/m, `claimed_at: ${date}`)
    : block.replace(/^claimed_by: .*$/m, (line) => `${line}\nclaimed_at: ${date}`);
  block = block.replace(/^updated: .*$/m, `updated: ${date}`);

  const next = block + raw.slice(fm[0].length);
  const outcome = parseDocument(doc.file, next);
  if (outcome.document === undefined) {
    throw new Error(`internal error — the start edit would corrupt ${doc.file}: ${outcome.issues[0]?.message}`);
  }
  await writeFile(path, next);
  return { id: wanted, file: doc.file, claimedBy: claimant, claimedAt: date };
}
