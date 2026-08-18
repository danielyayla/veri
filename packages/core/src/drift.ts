import type { Advisory, VeriDocument } from './types.ts';
import type { CommitFact, GitFacts } from './provenance.ts';
import { parseReceipts, subjectWorkOrders } from './provenance.ts';

/**
 * Drift detection (WO-045, REQ-021): nothing here blocks — every finding is
 * an advisory (DEC-025), and everything is derived on demand from documents
 * plus host-collected git facts (DEC-040). No stored state, ever.
 *
 * "After" is position in the facts list (newest-first, as `git log` emits
 * history): commit A is after commit B when A sits at a smaller index. The
 * one detector that may lack an anchor commit (an `approved:` stamp whose
 * commit predates the lifecycle-subject convention) falls back to comparing
 * committer dates against the stamp date.
 */

/**
 * A lifecycle commit for a document: the approve/supersede flow's own write,
 * recognized by the commit-subject convention ("DEC-040: approved"). These
 * change guarded frontmatter lines, not what was approved, so they are never
 * drift.
 */
function isLifecycleCommit(docId: string, subject: string): boolean {
  return subject.includes(docId) && /\b(approved|superseded|retired)\b/i.test(subject);
}

/** The document's path as git reports it: from the repo root, through veri/. */
function repoPath(veriPath: string, doc: VeriDocument): string {
  return veriPath === '' ? doc.file : `${veriPath}/${doc.file}`;
}

interface IndexedCommit {
  commit: CommitFact;
  /** Position in facts order — smaller is newer. */
  index: number;
}

function commitsTouching(facts: GitFacts, path: string): IndexedCommit[] {
  const hits: IndexedCommit[] = [];
  facts.commits.forEach((commit, index) => {
    if (commit.files.includes(path)) hits.push({ commit, index });
  });
  return hits;
}

const short = (sha: string): string => sha.slice(0, 7);

/**
 * Detector: an in-progress work order linking a superseded decision — work
 * standing on revoked authority. Pure over documents alone (no git), so it
 * runs everywhere check runs, context packages included. Done work orders
 * citing superseded decisions are history, not drift; backlog ones are
 * planning, and the chassis gates starting work, not planning (REQ-008).
 */
export function checkSupersededLinks(documents: VeriDocument[]): Advisory[] {
  const byId = new Map(documents.map((doc) => [doc.id, doc]));
  const advisories: Advisory[] = [];
  for (const doc of documents) {
    if (doc.type !== 'work-order' || doc.status !== 'in-progress') continue;
    for (const link of doc.links) {
      const target = byId.get(link.id);
      if (target === undefined || target.type !== 'decision' || target.status !== 'superseded') continue;
      const successor = target.supersededBy !== undefined ? ` by ${target.supersededBy}` : '';
      advisories.push({
        kind: 'drift-superseded-link',
        file: doc.file,
        id: doc.id,
        targetId: target.id,
        message: `${doc.id} is in-progress but stands on ${target.id}, which is superseded${successor} — revoked authority`,
      });
    }
  }
  return advisories;
}

/**
 * Git-backed drift (detectors one and three). `veriPath` is the repo-root-
 * relative path of the veri/ directory ('' when veri/ is the repo root) —
 * hosts know where the project sits inside the repository; core does not.
 */
export function checkDrift(documents: VeriDocument[], facts: GitFacts, veriPath: string): Advisory[] {
  const byId = new Map(documents.map((doc) => [doc.id, doc]));
  const advisories: Advisory[] = [];

  // Detector: a requirement (or decision) edited after the work order
  // implementing it closed — the receipt no longer proves the current text.
  // The close point is the newest commit belonging to the work order: a
  // WO-nnn:-claimed commit or one a receipt resolves to.
  for (const doc of documents) {
    if (doc.type !== 'work-order' || doc.status !== 'done') continue;
    const ownIndices: number[] = [];
    facts.commits.forEach((commit, index) => {
      if (subjectWorkOrders(commit.subject).includes(doc.id)) ownIndices.push(index);
    });
    for (const receipt of parseReceipts(doc.body)) {
      for (const sha of receipt.shas) {
        const index = facts.commits.findIndex((commit) => commit.sha.toLowerCase().startsWith(sha));
        if (index >= 0) ownIndices.push(index);
      }
    }
    if (ownIndices.length === 0) continue; // nothing anchors the close — receipt-unverified's territory
    const closeIndex = Math.min(...ownIndices);
    for (const link of doc.links) {
      if (link.rel !== 'implements') continue;
      const target = byId.get(link.id);
      if (target === undefined || (target.type !== 'requirement' && target.type !== 'decision')) continue;
      const offending = commitsTouching(facts, repoPath(veriPath, target))
        .filter(({ index }) => index < closeIndex)
        .filter(({ commit }) => !isLifecycleCommit(target.id, commit.subject));
      if (offending.length > 0) {
        const newest = offending[0].commit;
        advisories.push({
          kind: 'drift-edited-after-done',
          file: target.file,
          id: target.id,
          workOrderId: doc.id,
          sha: newest.sha,
          message: `${target.id} changed after ${doc.id} (implements it) closed — the receipt no longer proves the current text (${short(newest.sha)} "${newest.subject}")`,
        });
      }
    }
  }

  // Detector: an approved document whose file changed after its stamp — the
  // stamp no longer covers what the file says. Anchor on the lifecycle
  // commit when the convention identifies one; otherwise compare committer
  // dates against the stamp date (day granularity — a same-day edit after
  // approval is invisible, which the advisory tier can afford).
  for (const doc of documents) {
    if (doc.approved === undefined) continue;
    if (doc.status === 'superseded' || doc.status === 'retired') continue; // history, not drift
    const touching = commitsTouching(facts, repoPath(veriPath, doc));
    const stamp = touching.find(({ commit }) => isLifecycleCommit(doc.id, commit.subject));
    const offending = (
      stamp !== undefined
        ? touching.filter(({ index }) => index < stamp.index)
        : touching.filter(({ commit }) => commit.date > doc.approved!)
    ).filter(({ commit }) => !isLifecycleCommit(doc.id, commit.subject));
    if (offending.length > 0) {
      const newest = offending[0].commit;
      advisories.push({
        kind: 'drift-approved-edited',
        file: doc.file,
        id: doc.id,
        sha: newest.sha,
        message: `${doc.id} was approved ${doc.approved} but its file changed afterwards — the stamp no longer covers the current text (${short(newest.sha)} "${newest.subject}")`,
      });
    }
  }

  return advisories;
}
