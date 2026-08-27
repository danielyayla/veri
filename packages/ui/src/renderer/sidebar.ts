/**
 * Sidebar and type-panel derivations (WO-035, SRC-014). Pure — no DOM.
 * Lifecycle is the scale lever: sidebar collection rows show living counts
 * and the panel lists living docs with the dead remainder behind an
 * in-place expander, exactly as SRC-005 specified for the old tree.
 */
import type { DocType, VeriDocument } from '@verikb/core';
import { compareIds } from '@verikb/core/ids';
import { isWithdrawn } from '@verikb/core/pending';

/** Living statuses per type; null means no lifecycle (sources). */
const LIVING: Record<DocType, string[] | null> = {
  requirement: ['draft', 'accepted'],
  decision: ['proposed', 'active'],
  'work-order': ['backlog', 'ready', 'in-progress'],
  source: null,
  workflow: ['draft', 'accepted'],
  // WO-121: compile-keeping entry — product documents mirror the workflow's
  // lifecycle. Their surfacing in the sidebar is design-gated future work.
  product: ['draft', 'accepted'],
};

/** What a type's dead docs are called in the panel's expander. Sources had
    no dead state until `withdrawn` (WO-110, DEC-110) gave them one. */
export const DEAD_LABEL: Record<DocType, string> = {
  requirement: 'retired',
  decision: 'superseded',
  'work-order': 'done',
  source: 'withdrawn',
  workflow: 'retired',
  product: 'retired',
};

export function isLiving(doc: VeriDocument): boolean {
  // Withdrawn is terminal for every type (DEC-110) — including sources,
  // whose null lifecycle otherwise counts everything as living.
  if (isWithdrawn(doc)) return false;
  const living = LIVING[doc.type];
  return living === null || living.includes(doc.status);
}

/** The sidebar collection row's count (SRC-014: living, not total). */
export function livingCount(docs: VeriDocument[], type: DocType): number {
  return docs.filter((d) => d.type === type && isLiving(d)).length;
}

/** Descending id order via core's numeric-aware comparator (WO-050). */
const newestFirst = (a: VeriDocument, b: VeriDocument): number => compareIds(b.id, a.id);

/** Decisions read as a chronological feed (SRC-023): the panel inherits the
    retired Decision log's ordering — created date, newest first, ids as the
    tiebreak. Every other type keeps the id order (ids and dates agree there
    unless a doc is backdated, which decisions are the ones known to do). */
const newestCreatedFirst = (a: VeriDocument, b: VeriDocument): number =>
  a.created === b.created ? newestFirst(a, b) : b.created.localeCompare(a.created);

const panelOrder = (type: DocType): ((a: VeriDocument, b: VeriDocument) => number) =>
  type === 'decision' ? newestCreatedFirst : newestFirst;

export interface PanelList {
  /** PINNED group: this type's pinned docs, in the workspace-state order. */
  pinned: VeriDocument[];
  /** Living, unpinned, newest first (per panelOrder), filter-matched. */
  living: VeriDocument[];
  /** Dead docs behind the expander, newest first (per panelOrder), filter-matched. */
  dead: VeriDocument[];
  /** Total for the panel header — every doc of the type, unfiltered. */
  total: number;
}

/** The type panel's rows (SRC-014): filter matches id + title across living
    and dead; pinned docs float to their own group and leave the living list. */
export function panelList(docs: VeriDocument[], type: DocType, filter: string, pinned: string[]): PanelList {
  const all = docs.filter((d) => d.type === type);
  const q = filter.trim().toLowerCase();
  const match = (d: VeriDocument): boolean =>
    q === '' || d.id.toLowerCase().includes(q) || d.title.toLowerCase().includes(q);
  const living = all.filter((d) => isLiving(d) && match(d));
  const pinnedRows = pinned
    .map((id) => living.find((d) => d.id === id))
    .filter((d): d is VeriDocument => d !== undefined);
  const order = panelOrder(type);
  return {
    pinned: pinnedRows,
    living: living.filter((d) => !pinned.includes(d.id)).sort(order),
    dead: all.filter((d) => !isLiving(d) && match(d)).sort(order),
    total: all.length,
  };
}

export interface LivingGroup {
  label: string;
  docs: VeriDocument[];
}

/** The Board fold (WO-053, SRC-025): the Work Orders panel's living list
    splits into status subgroups — the kanban columns' one distinctive
    signal, carried as micro-headers. WO-103 adds the READY lane between
    them (the WO-098 dispatch state). Panel order is preserved within each
    group; empty groups drop rather than render a bare header. Every other
    type keeps the flat living list (null). */
export function livingGroups(living: VeriDocument[], type: DocType): LivingGroup[] | null {
  if (type !== 'work-order') return null;
  const groups: LivingGroup[] = [
    { label: 'Backlog', docs: living.filter((d) => d.status === 'backlog') },
    { label: 'Ready', docs: living.filter((d) => d.status === 'ready') },
    { label: 'In progress', docs: living.filter((d) => d.status === 'in-progress') },
  ];
  return groups.filter((g) => g.docs.length > 0);
}

/** Recents update on every doc open: front of the list, deduped, capped at 10.
    The sidebar's RECENT group renders the first 6 (SRC-018, reversing
    SRC-014's retirement); the palette's recency boost reads the same list. */
export function pushRecent(recents: string[], id: string): string[] {
  return [id, ...recents.filter((r) => r !== id)].slice(0, 10);
}
