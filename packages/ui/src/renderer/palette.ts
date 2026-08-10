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

export type PaletteRow =
  | { kind: 'doc'; hit: PaletteHit }
  | { kind: 'view'; view: ViewKey; label: string; glyph: string };

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
      const label = meta.label.toLowerCase();
      if (text === '') scored.push({ row: { kind: 'view', view, label: meta.label, glyph: meta.glyph }, score: 0.5 });
      else if (label.includes(text))
        scored.push({ row: { kind: 'view', view, label: meta.label, glyph: meta.glyph }, score: 58 });
    }
  }
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, PALETTE_MAX_ROWS)
    .map((s) => s.row);
}
