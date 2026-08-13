import type { Advisory, Issue, VeriDocument } from './types.ts';
import type { LoadResult } from './load.ts';
import type { DocType } from './ids.ts';
import { getTemplate } from './templates.ts';

export function checkDuplicateIds(documents: VeriDocument[]): Issue[] {
  const filesById = new Map<string, string[]>();
  for (const doc of documents) {
    const files = filesById.get(doc.id) ?? [];
    files.push(doc.file);
    filesById.set(doc.id, files);
  }
  const issues: Issue[] = [];
  for (const [id, files] of filesById) {
    if (files.length > 1) {
      issues.push({ kind: 'duplicate-id', id, files, message: `duplicate id ${id}` });
    }
  }
  return issues;
}

export function checkBrokenLinks(documents: VeriDocument[]): Issue[] {
  const ids = new Set(documents.map((doc) => doc.id));
  const issues: Issue[] = [];
  for (const doc of documents) {
    for (const link of doc.links) {
      if (!ids.has(link.id)) {
        issues.push({
          kind: 'broken-link',
          file: doc.file,
          sourceId: doc.id,
          targetId: link.id,
          via: 'frontmatter',
          message: `${doc.id} links to ${link.id} (rel "${link.rel}") but no document has that id`,
        });
      }
    }
    if (doc.supersededBy !== undefined && !ids.has(doc.supersededBy)) {
      issues.push({
        kind: 'broken-link',
        file: doc.file,
        sourceId: doc.id,
        targetId: doc.supersededBy,
        via: 'superseded_by',
        message: `${doc.id} is superseded by ${doc.supersededBy} but no document has that id`,
      });
    }
    for (const ref of doc.inlineRefs) {
      if (!ids.has(ref)) {
        issues.push({
          kind: 'broken-link',
          file: doc.file,
          sourceId: doc.id,
          targetId: ref,
          via: 'inline',
          message: `${doc.id} references [[${ref}]] inline but no document has that id`,
        });
      }
    }
  }
  return issues;
}

export function checkWorkOrderRequirements(documents: VeriDocument[]): Issue[] {
  const issues: Issue[] = [];
  for (const doc of documents) {
    if (doc.type !== 'work-order') continue;
    // Backlog is planning, and the gate is on starting work, not planning
    // (REQ-008, REQ-009): a freshly created WO passes check until it starts.
    if (doc.status === 'backlog') continue;
    if (!doc.links.some((link) => link.id.startsWith('REQ-'))) {
      issues.push({
        kind: 'wo-without-requirement',
        file: doc.file,
        id: doc.id,
        message: `work order ${doc.id} does not link to any requirement`,
      });
    }
  }
  return issues;
}

/** A document awaiting the user's approval and therefore not binding (REQ-008). */
export function isPending(doc: VeriDocument): boolean {
  return (
    (doc.type === 'requirement' && doc.status === 'draft') ||
    (doc.type === 'decision' && doc.status === 'proposed') ||
    (doc.type === 'workflow' && doc.status === 'draft')
  );
}

// The gate is on starting work, not on planning: backlog work orders may cite
// pending documents so a proposal and its work orders review as one package.
export function checkGatedWorkOrders(documents: VeriDocument[]): Issue[] {
  const byId = new Map(documents.map((doc) => [doc.id, doc]));
  const issues: Issue[] = [];
  for (const doc of documents) {
    if (doc.type !== 'work-order' || doc.status === 'backlog') continue;
    for (const link of doc.links) {
      const target = byId.get(link.id);
      if (target !== undefined && isPending(target)) {
        issues.push({
          kind: 'gated-wo',
          file: doc.file,
          id: doc.id,
          targetId: target.id,
          targetStatus: target.status,
          message: `work order ${doc.id} is ${doc.status} but depends on ${target.id}, which is still ${target.status} — approve it first (veri approve ${target.id})`,
        });
      }
    }
  }
  return issues;
}

export function checkApprovalStamps(documents: VeriDocument[]): Issue[] {
  const issues: Issue[] = [];
  for (const doc of documents) {
    const promoted =
      (doc.type === 'requirement' && doc.status === 'accepted') ||
      (doc.type === 'decision' && doc.status === 'active') ||
      (doc.type === 'workflow' && doc.status === 'accepted');
    if (promoted && doc.approved === undefined) {
      issues.push({
        kind: 'missing-approval',
        file: doc.file,
        id: doc.id,
        message: `${doc.id} is ${doc.status} but has no approved: date — promotion requires the user's stamp`,
      });
    }
  }
  return issues;
}

const UNCHECKED_BOX_RE = /^\s*[-*]\s+\[ \]/m;
const LIST_ITEM_RE = /^\s*[-*]\s+\S/m;

function receiptsSection(body: string): string | null {
  const start = body.search(/^##\s+Receipts\s*$/m);
  if (start < 0) return null;
  const afterHeading = body.slice(start).replace(/^.*(\r?\n|$)/, '');
  const next = afterHeading.search(/^##\s/m);
  return next >= 0 ? afterHeading.slice(0, next) : afterHeading;
}

/** A receipt is any list item under the "## Receipts" heading. */
export function hasReceipt(body: string): boolean {
  const section = receiptsSection(body);
  return section !== null && LIST_ITEM_RE.test(section);
}

export function checkDoneWorkOrders(documents: VeriDocument[]): Issue[] {
  const issues: Issue[] = [];
  for (const doc of documents) {
    if (doc.type !== 'work-order' || doc.status !== 'done') continue;
    if (UNCHECKED_BOX_RE.test(doc.body)) {
      issues.push({
        kind: 'done-wo-violation',
        file: doc.file,
        id: doc.id,
        problem: 'unchecked-criteria',
        message: `work order ${doc.id} is done but has unchecked acceptance criteria`,
      });
    }
    if (!hasReceipt(doc.body)) {
      issues.push({
        kind: 'done-wo-violation',
        file: doc.file,
        id: doc.id,
        problem: 'no-receipt',
        message: `work order ${doc.id} is done but has no receipt`,
      });
    }
  }
  return issues;
}

const SECTION_HEADING_RE = /^##\s+(.+?)\s*$/;

function sectionHeadings(body: string): string[] {
  return body
    .split('\n')
    .map((line) => SECTION_HEADING_RE.exec(line)?.[1])
    .filter((heading): heading is string => heading !== undefined);
}

/**
 * The `##` headings of a type's effective template, in order (DEC-025):
 * the single structure source per project. Read fresh from disk on every
 * call (DEC-002). A template with no `##` headings expects nothing.
 */
export function expectedSections(veriDir: string | URL, type: DocType): string[] {
  return sectionHeadings(getTemplate(veriDir, type).body);
}

/** Expected sections a document's body does not have, in template order. */
export function missingSections(veriDir: string | URL, doc: Pick<VeriDocument, 'type' | 'body'>): string[] {
  const present = new Set(sectionHeadings(doc.body));
  return expectedSections(veriDir, doc.type).filter((section) => !present.has(section));
}

/**
 * Structure findings (REQ-006 at DEC-025's advisory severity): one advisory
 * per expected-but-missing section. Never issues — template divergence must
 * not fail a document (DEC-023).
 */
export function checkStructure(veriDir: string | URL, documents: VeriDocument[]): Advisory[] {
  const advisories: Advisory[] = [];
  for (const doc of documents) {
    for (const section of missingSections(veriDir, doc)) {
      advisories.push({
        kind: 'missing-section',
        file: doc.file,
        id: doc.id,
        section,
        message: `${doc.id} has no "## ${section}" section — the ${doc.type} template expects one`,
      });
    }
  }
  return advisories;
}

export interface CheckResult {
  issues: Issue[];
  advisories: Advisory[];
}

/**
 * Everything check knows about the project: load-time issues plus all pure
 * checks, and the advisory tier (DEC-025) — reported separately so
 * advisories can never affect the issue count, exit codes, or gates.
 */
export function checkProject(load: LoadResult): CheckResult {
  return {
    issues: [
      ...load.issues,
      ...checkDuplicateIds(load.documents),
      ...checkBrokenLinks(load.documents),
      ...checkWorkOrderRequirements(load.documents),
      ...checkDoneWorkOrders(load.documents),
      ...checkGatedWorkOrders(load.documents),
      ...checkApprovalStamps(load.documents),
    ],
    advisories: checkStructure(load.dir, load.documents),
  };
}
