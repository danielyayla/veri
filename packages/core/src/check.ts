import type { Advisory, Issue, VeriDocument } from './types.ts';
import type { LoadResult } from './load.ts';
import { isPending, isWithdrawn } from './pending.ts';
import { compareIds } from './ids.ts';
import type { DocType } from './ids.ts';
import { daysBetween } from './binds.ts';
import { checkSupersededLinks } from './drift.ts';
import { checkArchitecture } from './architecture.ts';
import { getTemplate } from './templates.ts';
import { FORMAT_FILE, formatStatement } from './format.ts';
import type { FormatClassification } from './format.ts';

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
      // The team-merge case (REQ-026, DEC-070): name every claimant and the
      // mechanical fix, so the error is its own resolution guide.
      issues.push({
        kind: 'duplicate-id',
        id,
        files,
        message: `duplicate id ${id} — ${files.length} documents claim it; keep one and move the other with: veri renumber ${id} --file <path-to-move>`,
      });
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
    // Withdrawn is the other end of the same exemption (DEC-110): work that
    // was abandoned is not held to the standards of work that will happen.
    if (doc.status === 'backlog' || isWithdrawn(doc)) continue;
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

// The gate is on starting work, not on planning: backlog work orders may cite
// pending documents so a proposal and its work orders review as one package.
export function checkGatedWorkOrders(documents: VeriDocument[]): Issue[] {
  const byId = new Map(documents.map((doc) => [doc.id, doc]));
  const issues: Issue[] = [];
  for (const doc of documents) {
    if (doc.type !== 'work-order' || doc.status === 'backlog' || isWithdrawn(doc)) continue;
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

/**
 * Claim semantics (WO-099): in-progress means a session holds the work, and
 * the claim fields say which one. A work order that reached in-progress
 * without them is unaccounted — the concurrent-session collision REQ-026's
 * multi-committer world makes routine. Done work orders are exempt: the
 * claim is an operational fact, not retrofitted history.
 */
export function checkUnclaimedWorkOrders(documents: VeriDocument[]): Issue[] {
  const issues: Issue[] = [];
  for (const doc of documents) {
    if (doc.type !== 'work-order' || doc.status !== 'in-progress') continue;
    if (doc.claimedBy !== undefined && doc.claimedAt !== undefined) continue;
    issues.push({
      kind: 'unclaimed-wo',
      file: doc.file,
      id: doc.id,
      message: `work order ${doc.id} is in-progress but records no claim — start it with veri start ${doc.id} --as <session>, or add claimed_by/claimed_at`,
    });
  }
  return issues;
}

/** Whether either work order declares the other — a frontmatter link or an
    inline [[ref]] in either direction. A declared chain under one identity
    is a session deep in a prerequisite it split out, not a collision. */
function chained(a: VeriDocument, b: VeriDocument): boolean {
  return (
    a.links.some((link) => link.id === b.id) ||
    b.links.some((link) => link.id === a.id) ||
    a.inlineRefs.includes(b.id) ||
    b.inlineRefs.includes(a.id)
  );
}

/**
 * One session, one work order (WO-099): the worktree-per-work-order
 * convention means an identity holding two unrelated in-progress claims is
 * either a forgotten claim or two sessions sharing a name. Work orders that
 * reference each other are exempt — starting a discovered prerequisite is
 * deliberate nesting. Advisory — a human maintainer legitimately juggling
 * two is informed, never blocked.
 */
export function checkSharedClaims(documents: VeriDocument[]): Advisory[] {
  const held = new Map<string, VeriDocument[]>();
  for (const doc of documents) {
    if (doc.type !== 'work-order' || doc.status !== 'in-progress' || doc.claimedBy === undefined) continue;
    const group = held.get(doc.claimedBy) ?? [];
    group.push(doc);
    held.set(doc.claimedBy, group);
  }
  const advisories: Advisory[] = [];
  for (const [claimedBy, group] of held) {
    if (group.length < 2) continue;
    const sorted = group.sort((a, b) => compareIds(a.id, b.id));
    for (const [at, doc] of sorted.entries()) {
      if (at === 0) continue;
      const earlier = sorted.slice(0, at);
      if (earlier.some((other) => chained(doc, other))) continue;
      const first = earlier[0]!;
      advisories.push({
        kind: 'shared-claim',
        file: doc.file,
        id: doc.id,
        otherId: first.id,
        claimedBy,
        message: `${doc.id} and ${first.id} are both in-progress under the claim "${claimedBy}" with no link between them — one session holds one work order; finish or release one`,
      });
    }
  }
  return advisories;
}

const RECEIPT_DATE_RE = /^\s*[-*]\s+(\d{4}-\d{2}-\d{2})/gm;

/**
 * Stale claims (WO-099): a claimed in-progress work order whose newest sign
 * of life — the claim date or any receipt date — is older than the project's
 * staleness window (the WO-088 `stale_after_days` knob; one knob, one
 * meaning of "silence"). Pure over documents plus a host-provided today
 * (DEC-076), so unlike binding staleness it needs no git and runs on every
 * surface, the subprocess-free MCP server included.
 */
export function checkStaleClaims(documents: VeriDocument[], today: string, windowDays: number): Advisory[] {
  const advisories: Advisory[] = [];
  for (const doc of documents) {
    if (doc.type !== 'work-order' || doc.status !== 'in-progress' || doc.claimedAt === undefined) continue;
    const section = receiptsSection(doc.body) ?? '';
    const dates = [doc.claimedAt, ...[...section.matchAll(RECEIPT_DATE_RE)].map((match) => match[1]!)];
    const newest = dates.sort().at(-1)!;
    if (daysBetween(newest, today) < windowDays) continue;
    const since = newest === doc.claimedAt ? `was claimed ${newest}` : `last filed a receipt ${newest}`;
    advisories.push({
      kind: 'stale-claim',
      file: doc.file,
      id: doc.id,
      message: `${doc.id} is in-progress under "${doc.claimedBy}" but ${since} with no receipt since — stale after ${windowDays} days`,
    });
  }
  return advisories;
}

/**
 * The design gate, machine-checked (WO-010): a work order whose body mentions
 * a design-gated path and has started (in-progress/done) must link at least
 * one existing document with rel "designed-by". The trigger paths are
 * project-defined — declared as `design_gate_paths` on the workflow document
 * (DEC-039) — so core carries nothing specific to any repo's layout; with no
 * paths declared the gate is inert. Body-text mention is the v1 heuristic —
 * not git diffs or file lists. A designed-by link whose target id doesn't
 * exist does not satisfy the gate; the broken-link check reports that link
 * separately.
 */
export function checkDesignGate(documents: VeriDocument[]): Issue[] {
  const paths = documents
    .filter((doc) => doc.type === 'workflow' && doc.status !== 'retired')
    .flatMap((doc) => (doc.frontmatter['design_gate_paths'] as string[] | undefined) ?? []);
  if (paths.length === 0) return [];
  const ids = new Set(documents.map((doc) => doc.id));
  const issues: Issue[] = [];
  for (const doc of documents) {
    if (doc.type !== 'work-order' || doc.status === 'backlog' || isWithdrawn(doc)) continue;
    const touched = paths.find((path) => doc.body.includes(path));
    if (touched === undefined) continue;
    const designed = doc.links.some((link) => link.rel === 'designed-by' && ids.has(link.id));
    if (!designed) {
      issues.push({
        kind: 'ui-wo-without-design',
        file: doc.file,
        id: doc.id,
        message: `work order ${doc.id} touches design-gated ${touched} but links no designed-by design document — this project's workflow requires the design first`,
      });
    }
  }
  return issues;
}

/**
 * A document whose status carries approval weight (REQ-008). A ready work
 * order is promoted — the status only exists via the stamp (WO-098) — but a
 * started one is not: execution spends the clearance, and historical work
 * orders that never passed through ready stay valid without a stamp.
 */
function isPromoted(doc: VeriDocument): boolean {
  return (
    (doc.type === 'requirement' && doc.status === 'accepted') ||
    (doc.type === 'decision' && doc.status === 'active') ||
    (doc.type === 'workflow' && doc.status === 'accepted') ||
    (doc.type === 'work-order' && doc.status === 'ready')
  );
}

/**
 * The maintainer roster (DEC-071): free-form display names declared on the
 * workflow document's frontmatter, the established home for project config
 * (design_gate_paths, the DEC-059 module registry). Empty means solo — team
 * semantics stay inert.
 */
export function maintainerRegistry(documents: VeriDocument[]): string[] {
  return documents
    .filter((doc) => doc.type === 'workflow' && doc.status !== 'retired')
    .flatMap((doc) => (doc.frontmatter['maintainers'] as string[] | undefined) ?? []);
}

/**
 * DEC-071's hard tier: in a project that declares maintainers, a stamp
 * attributed to someone not on the list is an issue — misattribution fails
 * where mere absence only warns (see checkMissingApprovers).
 */
export function checkApprovers(documents: VeriDocument[]): Issue[] {
  const maintainers = maintainerRegistry(documents);
  if (maintainers.length === 0) return [];
  const issues: Issue[] = [];
  for (const doc of documents) {
    if (doc.approvedBy !== undefined && !maintainers.includes(doc.approvedBy)) {
      issues.push({
        kind: 'unknown-approver',
        file: doc.file,
        id: doc.id,
        approver: doc.approvedBy,
        message: `${doc.id} is approved by "${doc.approvedBy}", who is not in the workflow's maintainers list (${maintainers.join(', ')})`,
      });
    }
  }
  return issues;
}

/**
 * DEC-071's soft tier: a promoted document with no approved_by in a
 * maintainers project. Advisory by design — every stamp made before the
 * team formed is grandfathered as a warning, never a failure (DEC-025).
 */
export function checkMissingApprovers(documents: VeriDocument[]): Advisory[] {
  const maintainers = maintainerRegistry(documents);
  if (maintainers.length === 0) return [];
  const advisories: Advisory[] = [];
  for (const doc of documents) {
    if (isPromoted(doc) && doc.approved !== undefined && doc.approvedBy === undefined) {
      advisories.push({
        kind: 'missing-approver',
        file: doc.file,
        id: doc.id,
        message: `${doc.id} is ${doc.status} but its stamp names no approver — this project declares maintainers; re-approve with veri approve ${doc.id} --as <name> to attribute it`,
      });
    }
  }
  return advisories;
}

export function checkApprovalStamps(documents: VeriDocument[]): Issue[] {
  const issues: Issue[] = [];
  for (const doc of documents) {
    if (isPromoted(doc) && doc.approved === undefined) {
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

export function receiptsSection(body: string): string | null {
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

/**
 * REQ-015: a newer or unreadable format is an issue — operating on it risks
 * misparse. Older and pre-marker are NOT issues: those projects always
 * worked and must keep opening; the check report names them and the
 * available migration, nothing more.
 */
export function checkFormat(format: FormatClassification): Issue[] {
  if (format.kind !== 'newer' && format.kind !== 'invalid') return [];
  return [
    {
      kind: 'format-mismatch',
      file: FORMAT_FILE,
      problem: format.kind,
      message: formatStatement(format) ?? 'format mismatch',
    },
  ];
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
      ...checkFormat(load.format),
      ...checkDuplicateIds(load.documents),
      ...checkBrokenLinks(load.documents),
      ...checkWorkOrderRequirements(load.documents),
      ...checkUnclaimedWorkOrders(load.documents),
      ...checkDoneWorkOrders(load.documents),
      ...checkGatedWorkOrders(load.documents),
      ...checkDesignGate(load.documents),
      ...checkApprovalStamps(load.documents),
      ...checkApprovers(load.documents),
      ...checkArchitecture(load.documents),
    ],
    // The pure advisory tier. Git-backed advisories (receipt verification,
    // WO-044; git drift, WO-045) are pushed by hosts that collect facts
    // (DEC-040) — never here, so pure callers stay subprocess-free.
    advisories: [
      ...checkStructure(load.dir, load.documents),
      ...checkSupersededLinks(load.documents),
      ...checkMissingApprovers(load.documents),
      ...checkSharedClaims(load.documents),
      // Stale claims need a clock (host territory, DEC-076) — deriveFindings
      // adds checkStaleClaims with the host's today.
    ],
  };
}
