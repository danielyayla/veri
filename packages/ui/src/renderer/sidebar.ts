/**
 * Sidebar working-set derivations (WO-014, SRC-005 layer 3). Pure — no DOM.
 * Lifecycle is the scale lever: type sections default to living docs and
 * expose the dead remainder behind a per-section expander.
 */
import type { DocType, VeriDocument } from '@veri/core';

/** Living statuses per type; null means no lifecycle (sources). */
const LIVING: Record<DocType, string[] | null> = {
  requirement: ['draft', 'accepted'],
  decision: ['active'],
  'work-order': ['backlog', 'in-progress'],
  source: null,
};

/** What a section's dead docs are called in its footer expander. */
export const DEAD_LABEL: Record<DocType, string> = {
  requirement: 'retired',
  decision: 'superseded',
  'work-order': 'done',
  source: '',
};

export function isLiving(doc: VeriDocument): boolean {
  const living = LIVING[doc.type];
  return living === null || living.includes(doc.status);
}

export interface TreeSection {
  /** Rows to render, id-sorted: living only, or everything when expanded. */
  shown: VeriDocument[];
  /** Living count for the section header. */
  livingCount: number;
  /** Dead docs hidden behind the expander (0 hides the expander). */
  deadCount: number;
}

export function treeSection(docs: VeriDocument[], type: DocType, showDead: boolean): TreeSection {
  const all = docs.filter((d) => d.type === type).sort((a, b) => a.id.localeCompare(b.id));
  const living = all.filter(isLiving);
  return {
    shown: showDead || LIVING[type] === null ? all : living,
    livingCount: living.length,
    deadCount: all.length - living.length,
  };
}

/** RECENT shows the last 8 opened docs, most recent first, excluding pinned. */
export function visibleRecents(recents: string[], pinned: string[]): string[] {
  return recents.filter((id) => !pinned.includes(id)).slice(0, 8);
}

/** Recents update on every doc open: front of the list, deduped, capped at 10. */
export function pushRecent(recents: string[], id: string): string[] {
  return [id, ...recents.filter((r) => r !== id)].slice(0, 10);
}
