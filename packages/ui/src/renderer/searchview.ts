/**
 * Pure row logic for the Search view (WO-048, SRC-022). The view renders the
 * shared library's hits unsliced in rank order, capped at 200 rendered rows
 * with a final "N more — refine the query" line; snippets bold the match.
 * No DOM — views/search.ts owns rendering.
 */
import type { PaletteHit } from '@veri/mcp';

export const SEARCH_MAX_ROWS = 200;

export interface SearchList {
  rows: PaletteHit[];
  /** Hits beyond the render cap — 0 means no refine line. */
  more: number;
}

export function searchRows(hits: PaletteHit[]): SearchList {
  return { rows: hits.slice(0, SEARCH_MAX_ROWS), more: Math.max(0, hits.length - SEARCH_MAX_ROWS) };
}

export interface Segment {
  text: string;
  bold: boolean;
}

/** Split `text` into segments, bolding every case-insensitive occurrence of
    `needle` — how a snippet shows its match. Empty needle: nothing bolds. */
export function boldSegments(text: string, needle: string): Segment[] {
  if (needle === '' || text === '') return text === '' ? [] : [{ text, bold: false }];
  const lower = text.toLowerCase();
  const n = needle.toLowerCase();
  const out: Segment[] = [];
  let i = 0;
  while (i < text.length) {
    const at = lower.indexOf(n, i);
    if (at === -1) {
      out.push({ text: text.slice(i), bold: false });
      break;
    }
    if (at > i) out.push({ text: text.slice(i, at), bold: false });
    out.push({ text: text.slice(at, at + n.length), bold: true });
    i = at + n.length;
  }
  return out;
}
