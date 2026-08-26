import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { compareIds, loadProject, parsePaletteQuery, rankDocs } from '@verikb/core';
import type { PaletteResult } from '@verikb/core';

export interface SearchHit {
  id: string;
  type: string;
  status: string;
  title: string;
  matched: Array<'id' | 'title' | 'body'>;
}

/** Case-insensitive substring match over id, title, and body (see WO-003: no semantic search). */
export async function searchDocs(projectRoot: string, query: string): Promise<SearchHit[]> {
  const veriDir = join(projectRoot, 'veri');
  if (!existsSync(veriDir)) throw new Error(`no veri/ directory under ${projectRoot}`);
  const needle = query.toLowerCase();
  if (needle.trim() === '') return [];
  const { documents } = await loadProject(veriDir);
  const hits: SearchHit[] = [];
  for (const doc of documents) {
    const matched: SearchHit['matched'] = [];
    if (doc.id.toLowerCase().includes(needle)) matched.push('id');
    if (doc.title.toLowerCase().includes(needle)) matched.push('title');
    if (doc.body.toLowerCase().includes(needle)) matched.push('body');
    if (matched.length > 0) {
      hits.push({ id: doc.id, type: doc.type, status: doc.status, title: doc.title, matched });
    }
  }
  return hits.sort((a, b) => compareIds(a.id, b.id));
}

// ---- Palette search (WO-013, SRC-005 layer 2) ----------------------------
// The pure grammar and ranking (parsePaletteQuery, relatedIds, rankDocs, the
// Palette* shapes) live in @verikb/core since WO-106 (DEC-104): pure domain
// logic over VeriDocument[], reachable by every surface. This module keeps
// the door's own pieces — `searchDocs` above (WO-003 substring semantics)
// and the `paletteSearch` IO wrapper below — and re-exports the moved names
// so @verikb/mcp's public API is unchanged for every existing consumer.

export { parsePaletteQuery, rankDocs, relatedIds } from '@verikb/core';
export type { PaletteHit, PaletteQuery, PaletteResult } from '@verikb/core';

export async function paletteSearch(projectRoot: string, raw: string, recents: string[] = []): Promise<PaletteResult> {
  const veriDir = join(projectRoot, 'veri');
  if (!existsSync(veriDir)) throw new Error(`no veri/ directory under ${projectRoot}`);
  const query = parsePaletteQuery(raw);
  const { documents } = await loadProject(veriDir);
  return { query, hits: rankDocs(documents, query, recents) };
}
