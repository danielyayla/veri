/**
 * Command-palette row assembly (WO-013, SRC-005 layer 2). Doc hits come
 * ranked from the shared search library (DEC-009); this module only merges
 * in view rows and cuts the list to the top 8. Pure — no DOM.
 */
import type { PaletteResult } from '@verikb/mcp';
import type { PaletteHit } from '@verikb/mcp';
import { VIEW_META } from './tabs.ts';
import type { ViewKey } from './tabs.ts';

export const PALETTE_MAX_ROWS = 8;

export type CommandKey = 'new-project' | 'open-beside';

export type PaletteRow =
  | { kind: 'doc'; hit: PaletteHit }
  | { kind: 'view'; view: ViewKey; label: string; glyph: string }
  | { kind: 'command'; command: CommandKey; label: string; glyph: string }
  /** "See all N results ↵" (WO-048, SRC-022): when doc hits exceed the 8-row
      cap, the last row hands the query to the Search view. */
  | { kind: 'overflow'; count: number };

/** Commands are actions, not destinations (SRC-007): unlike views they never
    show on an empty query — an empty palette is for navigation, and a
    project-creating row there is a mis-Enter hazard. */
const COMMAND_META: Record<CommandKey, { label: string; glyph: string; terms: string[] }> = {
  'new-project': { label: 'New project…', glyph: '+', terms: ['new', 'project', 'create'] },
  // WO-055 (SRC-027): the current entry opens in the other pane — ⌘\.
  'open-beside': { label: 'Open beside — ⌘\\', glyph: '◫', terms: ['open', 'beside', 'split', 'pane', 'side'] },
};

/** Extra query terms a view answers to beyond its label (WO-036: the
    Settings view answers for the sections it hosts). */
const VIEW_ALIASES: Partial<Record<ViewKey, string[]>> = {
  settings: ['templates', 'agent', 'connection', 'updates'],
  import: ['import', 'brownfield', 'mine', 'knowledge'],
  architecture: ['map', 'rules', 'modules', 'lattice', 'dependencies', 'violations'],
};

/** The Import row reads as the action it is (SRC-039 entry 1c), not the
    tab's short label. */
const VIEW_LABELS: Partial<Record<ViewKey, string>> = {
  import: 'Import project knowledge…',
};

/** Views surface by label match, and are suppressed while a type/status
    filter is active (filters talk about documents, not views). */
export function paletteRows(result: PaletteResult, opts: { brownfield?: boolean } = {}): PaletteRow[] {
  const { text, type, statuses, related } = result.query;
  const scored: Array<{ row: PaletteRow; score: number }> = result.hits.map((hit) => ({
    row: { kind: 'doc', hit },
    score: hit.score,
  }));
  if (type === null && statuses.length === 0 && related === null) {
    for (const [view, meta] of Object.entries(VIEW_META) as Array<[ViewKey, (typeof VIEW_META)[ViewKey]]>) {
      // Import is offered only where it applies (SRC-039: brownfield roots).
      if (view === 'import' && opts.brownfield !== true) continue;
      const label = VIEW_LABELS[view] ?? meta.label;
      const terms = [label.toLowerCase(), ...(VIEW_ALIASES[view] ?? [])];
      // 130 sits between the ranking core's single-term title-starts (150)
      // and title-contains (125) tiers — the same slot the old constant held
      // against the pre-WO-090 scale.
      if (text === '') scored.push({ row: { kind: 'view', view, label, glyph: meta.glyph }, score: 0.5 });
      else if (terms.some((term) => term.includes(text)))
        scored.push({ row: { kind: 'view', view, label, glyph: meta.glyph }, score: 130 });
    }
    for (const [command, meta] of Object.entries(COMMAND_META) as Array<
      [CommandKey, (typeof COMMAND_META)[CommandKey]]
    >) {
      if (text !== '' && meta.terms.some((term) => term.includes(text)))
        scored.push({ row: { kind: 'command', command, label: meta.label, glyph: meta.glyph }, score: 130 });
    }
  }
  const rows = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, PALETTE_MAX_ROWS)
    .map((s) => s.row);
  // More doc hits than the cap can show: the last row becomes the door to
  // the full list (WO-048). The cap itself is untouched.
  if (result.hits.length > PALETTE_MAX_ROWS) rows[PALETTE_MAX_ROWS - 1] = { kind: 'overflow', count: result.hits.length };
  return rows;
}
