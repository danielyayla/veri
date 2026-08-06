import type { Issue, VeriDocument } from './types.ts';
import type { LoadResult } from './load.ts';

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
      issues.push({ kind: 'duplicate-id', id, files, message: `duplicate id ${id}: ${files.join(', ')}` });
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

/** Every issue in the project: load-time issues plus all pure checks. */
export function checkProject(load: LoadResult): Issue[] {
  return [
    ...load.issues,
    ...checkDuplicateIds(load.documents),
    ...checkBrokenLinks(load.documents),
    ...checkWorkOrderRequirements(load.documents),
    ...checkDoneWorkOrders(load.documents),
  ];
}
