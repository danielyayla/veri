/**
 * Command-palette row assembly (WO-013, SRC-005 layer 2). Doc hits come
 * ranked from the shared search library (DEC-009); this module only merges
 * in view rows and cuts the list to the top 8. Pure — no DOM.
 */
import type { PaletteResult } from '@veri/mcp';
import type { PaletteHit } from '@veri/mcp';
import { VIEW_META } from './tabs.ts';
import type { ViewKey } from './tabs.ts';

export const PALETTE_MAX_ROWS = 8;

export type CommandKey = 'new-project';

export type PaletteRow =
  | { kind: 'doc'; hit: PaletteHit }
  | { kind: 'view'; view: ViewKey; label: string; glyph: string }
  | { kind: 'command'; command: CommandKey; label: string; glyph: string };

/** Commands are actions, not destinations (SRC-007): unlike views they never
    show on an empty query — an empty palette is for navigation, and a
    project-creating row there is a mis-Enter hazard. */
const COMMAND_META: Record<CommandKey, { label: string; glyph: string; terms: string[] }> = {
  'new-project': { label: 'New project…', glyph: '+', terms: ['new', 'project', 'create'] },
};

/** Extra query terms a view answers to beyond its label (WO-036: the
    Settings view answers for the sections it hosts). */
const VIEW_ALIASES: Partial<Record<ViewKey, string[]>> = {
  settings: ['templates', 'agent', 'connection', 'updates'],
};

/** Views surface by label match, and are suppressed while a type/status
    filter is active (filters talk about documents, not views). */
export function paletteRows(result: PaletteResult): PaletteRow[] {
  const { text, type, statuses } = result.query;
  const scored: Array<{ row: PaletteRow; score: number }> = result.hits.map((hit) => ({
    row: { kind: 'doc', hit },
    score: hit.score,
  }));
  if (type === null && statuses.length === 0) {
    for (const [view, meta] of Object.entries(VIEW_META) as Array<[ViewKey, (typeof VIEW_META)[ViewKey]]>) {
      const terms = [meta.label.toLowerCase(), ...(VIEW_ALIASES[view] ?? [])];
      if (text === '') scored.push({ row: { kind: 'view', view, label: meta.label, glyph: meta.glyph }, score: 0.5 });
      else if (terms.some((term) => term.includes(text)))
        scored.push({ row: { kind: 'view', view, label: meta.label, glyph: meta.glyph }, score: 58 });
    }
    for (const [command, meta] of Object.entries(COMMAND_META) as Array<
      [CommandKey, (typeof COMMAND_META)[CommandKey]]
    >) {
      if (text !== '' && meta.terms.some((term) => term.includes(text)))
        scored.push({ row: { kind: 'command', command, label: meta.label, glyph: meta.glyph }, score: 58 });
    }
  }
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, PALETTE_MAX_ROWS)
    .map((s) => s.row);
}
