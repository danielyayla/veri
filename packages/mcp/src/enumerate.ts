import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { compareIds, isPending, isWithdrawn, loadProject, nextDispatchable } from '@verikb/core';
import type { DocType, VeriDocument } from '@verikb/core';

/**
 * The enumeration surface (REQ-041 items 1 and 2, WO-127): a session must be
 * able to enumerate the corpus and read the dispatch queue without shelling
 * out to the CLI or leaning on ranked search. Both are thin derivations over
 * the same load path every other surface uses (DEC-009), and every status
 * verdict comes from core — `isPending`, `isWithdrawn`, `nextDispatchable` —
 * so this surface can never disagree with `veri check` or `veri next`.
 */

/**
 * Every status the frontmatter schema accepts, across all seven document types
 * (see packages/core/src/schema.ts). Held here so the tool advertises a
 * closed vocabulary and refuses a typo loudly instead of answering it with an
 * empty list — a filter that silently matches nothing is the no-op check
 * DEC-058 rules out. The colocated drift test derives the same set from
 * core's schema and fails if this list falls behind it.
 */
export const DOCUMENT_STATUSES = [
  'draft',
  'accepted',
  'retired',
  'proposed',
  'active',
  'superseded',
  'backlog',
  'in-progress',
  'done',
  'imported',
  'withdrawn',
] as const;

export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

/** One enumerated document: what a skill needs to decide whether to open it. */
export interface DocumentRow {
  id: string;
  title: string;
  type: DocType;
  status: string;
  /** YYYY-MM-DD, the document's own `updated` stamp. */
  updated: string;
  /** Path relative to the project root, e.g. veri/requirements/REQ-001-… */
  file: string;
  /**
   * Awaiting the user's approval and therefore not binding (REQ-008), read
   * from core's `isPending` so no consumer re-derives the gate predicate.
   */
  pending: boolean;
}

export interface ListFilters {
  type?: DocType;
  status?: DocumentStatus;
  /**
   * Staleness cutoff, YYYY-MM-DD: keeps documents whose `updated` is strictly
   * before it. Exclusive so a cutoff of today's date means "not touched
   * today", and ISO dates compare correctly as strings.
   */
  updatedBefore?: string;
}

/** A queue entry for a work order someone holds (WO-099). */
export interface ClaimedRow extends DocumentRow {
  /** Null when the work order carries no claim — an unclaimed-wo violation. */
  claimedBy: string | null;
  claimedAt: string | null;
}

export interface Queue {
  /** Backlog work orders awaiting the user's dispatch judgment (DEC-143),
      in queue order; `backlog[0]` is `veri next`'s head. */
  backlog: DocumentRow[];
  /** In-progress work orders with the claims held on them, in id order. */
  inProgress: ClaimedRow[];
}

function requireVeriDir(projectRoot: string): string {
  const dir = join(projectRoot, 'veri');
  if (!existsSync(dir)) throw new Error(`no veri/ directory under ${projectRoot}`);
  return dir;
}

function row(doc: VeriDocument): DocumentRow {
  return {
    id: doc.id,
    title: doc.title,
    type: doc.type,
    status: doc.status,
    updated: doc.updated,
    file: `veri/${doc.file}`,
    pending: isPending(doc),
  };
}

/**
 * The corpus, filtered and in id order (`compareIds`, so WO-999 precedes
 * WO-1000). Filters combine — each narrows the set the others left. Withdrawn
 * documents are out of play (DEC-110) and stay out unless asked for by name:
 * `status: 'withdrawn'` is the only way to see them.
 */
export async function listDocuments(projectRoot: string, filters: ListFilters = {}): Promise<DocumentRow[]> {
  const { documents } = await loadProject(requireVeriDir(projectRoot));
  return documents
    .filter((doc) => filters.status === 'withdrawn' || !isWithdrawn(doc))
    .filter((doc) => filters.type === undefined || doc.type === filters.type)
    .filter((doc) => filters.status === undefined || doc.status === filters.status)
    .filter((doc) => filters.updatedBefore === undefined || doc.updated < filters.updatedBefore)
    .sort((a, b) => compareIds(a.id, b.id))
    .map(row);
}

/**
 * The judgment queue (DEC-143): what awaits the user's dispatch and what is
 * already held. The head comes from `nextDispatchable` itself rather than
 * from this module's sort, so `get_queue`'s first row is by construction
 * the id `veri next` prints — one evaluation site for the queue's head.
 */
export async function getQueue(projectRoot: string): Promise<Queue> {
  const { documents } = await loadProject(requireVeriDir(projectRoot));
  const workOrders = documents.filter((doc) => doc.type === 'work-order' && !isWithdrawn(doc));
  const byId = (a: VeriDocument, b: VeriDocument): number => compareIds(a.id, b.id);

  const head = nextDispatchable(documents);
  const rest = workOrders.filter((doc) => doc.status === 'backlog' && doc.id !== head?.id).sort(byId);

  return {
    backlog: (head === undefined ? rest : [head, ...rest]).map(row),
    inProgress: workOrders
      .filter((doc) => doc.status === 'in-progress')
      .sort(byId)
      .map((doc) => ({ ...row(doc), claimedBy: doc.claimedBy ?? null, claimedAt: doc.claimedAt ?? null })),
  };
}

/** One document per line, title last so it may contain anything. */
export function renderDocuments(rows: DocumentRow[]): string {
  if (rows.length === 0) return 'no documents match';
  const lines = rows.map(
    (entry) => `${entry.id}  ${entry.type}  ${entry.status}${entry.pending ? ' (pending)' : ''}  updated ${entry.updated}  ${entry.file}  ${entry.title}`,
  );
  return [`${rows.length} document${rows.length === 1 ? '' : 's'}:`, ...lines].join('\n');
}

/** The queue as text: what awaits the user's judgment first, then who holds
    what. Dispatch is human-only (DEC-143) — the rendering says so instead
    of inviting an agent to start anything. */
export function renderQueue(queue: Queue): string {
  const lines = [
    queue.backlog.length === 0
      ? 'Backlog (0) — nothing awaits dispatch judgment.'
      : `Backlog (${queue.backlog.length}) — awaiting the user's dispatch (veri dispatch <WO-id> --as <session>), head first:`,
    ...queue.backlog.map((entry) => `${entry.id}  ${entry.file}  ${entry.title}`),
    '',
    queue.inProgress.length === 0 ? 'In progress (0) — no work order is claimed.' : `In progress (${queue.inProgress.length}):`,
    ...queue.inProgress.map(
      (entry) =>
        `${entry.id}  claimed by ${entry.claimedBy ?? '(unclaimed — a check violation)'}` +
        `${entry.claimedAt === null ? '' : ` since ${entry.claimedAt}`}  ${entry.file}  ${entry.title}`,
    ),
  ];
  return lines.join('\n');
}
