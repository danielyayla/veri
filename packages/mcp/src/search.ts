import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadProject, parsePaletteQuery, rankDocs } from '@verikb/core';
import type { PaletteResult } from '@verikb/core';

// ---- Palette search (WO-013, SRC-005 layer 2) ----------------------------
// The pure grammar and ranking (parsePaletteQuery, relatedIds, rankDocs, the
// Palette* shapes) live in @verikb/core since WO-106 (DEC-104): pure domain
// logic over VeriDocument[], reachable by every surface. This module keeps
// the door's own piece — the `paletteSearch` IO wrapper below — and
// re-exports the moved names so @verikb/mcp's public API holds for every
// existing consumer. (The legacy WO-003 substring matcher sat wired to no
// tool since DEC-044 rerouted `search` through the palette grammar; WO-153
// deleted it.)

export { parsePaletteQuery, rankDocs, relatedIds } from '@verikb/core';
export type { PaletteHit, PaletteQuery, PaletteResult } from '@verikb/core';

export async function paletteSearch(projectRoot: string, raw: string, recents: string[] = []): Promise<PaletteResult> {
  const veriDir = join(projectRoot, 'veri');
  if (!existsSync(veriDir)) throw new Error(`no veri/ directory under ${projectRoot}`);
  const query = parsePaletteQuery(raw);
  const { documents } = await loadProject(veriDir);
  return { query, hits: rankDocs(documents, query, recents) };
}
