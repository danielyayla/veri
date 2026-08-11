import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadProject } from '@veri/core';
import type { DocType, VeriDocument } from '@veri/core';

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
  return hits.sort((a, b) => a.id.localeCompare(b.id));
}

// ---- Palette search (WO-013, SRC-005 layer 2) ----------------------------
// Ranked matching over the same corpus the MCP `search` tool scans, exported
// so the UI reuses this one implementation (DEC-009: no second index). The
// MCP tool itself keeps the plain substring semantics of `searchDocs`.

const TYPE_PREFIX: Record<string, DocType> = {
  req: 'requirement',
  dec: 'decision',
  wo: 'work-order',
  src: 'source',
};

/** `is:active` means living (SRC-005: lifecycle is the scale lever). */
const LIVING = new Set(['draft', 'accepted', 'active', 'backlog', 'inprogress', 'proposed']);

/** `is:proposed` means awaiting review — proposed decisions AND draft
    requirements, one filter for the whole approval queue (SRC-006). */
const PENDING = new Set(['proposed', 'draft']);

export interface PaletteQuery {
  /** Free text, lowercased, with filter prefixes stripped. */
  text: string;
  /** From `req:` / `dec:` / `wo:` / `src:` — last prefix wins. */
  type: DocType | null;
  /** From `is:…`, normalized to letters only (`is:in-progress` ≡ `is:inprogress`). */
  statuses: string[];
}

export interface PaletteHit {
  id: string;
  type: string;
  status: string;
  title: string;
  score: number;
  /** One-line context around a body match; null for id/title matches. */
  snippet: string | null;
}

export interface PaletteResult {
  query: PaletteQuery;
  hits: PaletteHit[];
}

export function parsePaletteQuery(raw: string): PaletteQuery {
  let type: DocType | null = null;
  const statuses: string[] = [];
  const text = raw
    .toLowerCase()
    .replace(/\b(req|dec|wo|src):/g, (_m, t: string) => {
      type = TYPE_PREFIX[t] ?? null;
      return ' ';
    })
    .replace(/\bis:([a-z-]+)/g, (_m, s: string) => {
      statuses.push(s.replace(/[^a-z]/g, ''));
      return ' ';
    })
    .replace(/\s+/g, ' ')
    .trim();
  return { text, type, statuses };
}

/**
 * Score tiers per the SRC-005 handoff: exact id (zero-padding optional, so
 * `req14` → REQ-014) → id prefix → title starts-with → title contains →
 * body match (with snippet). Recently opened docs get a fading boost.
 * Empty text scores every filter-surviving doc 1, so `wo:` alone lists all
 * work orders and an empty palette floats the recents.
 */
export function rankDocs(documents: VeriDocument[], query: PaletteQuery, recents: string[] = []): PaletteHit[] {
  const qId = query.text.replace(/[^a-z0-9]/g, '');
  const hits: PaletteHit[] = [];
  for (const doc of documents) {
    if (query.type !== null && doc.type !== query.type) continue;
    const status = doc.status.toLowerCase().replace(/[^a-z]/g, '');
    if (
      !query.statuses.every(
        (f) => status === f || (f === 'active' && LIVING.has(status)) || (f === 'proposed' && PENDING.has(status)),
      )
    )
      continue;
    const idNorm = doc.id.toLowerCase().replace(/[^a-z0-9]/g, '');
    const idShort = idNorm.replace(/0+(\d)/, '$1');
    const title = doc.title.toLowerCase();
    let score = 0;
    let snippet: string | null = null;
    if (query.text === '') {
      score = 1;
    } else if (qId !== '' && (idNorm === qId || idShort === qId)) {
      score = 100;
    } else if (qId !== '' && idNorm.startsWith(qId)) {
      score = 80;
    } else if (title.startsWith(query.text)) {
      score = 62;
    } else if (title.includes(query.text)) {
      score = 55;
    } else {
      const body = doc.body.replace(/\s+/g, ' ');
      const at = body.toLowerCase().indexOf(query.text);
      if (at >= 0) {
        score = 30;
        snippet = `…${body.slice(Math.max(0, at - 20), at + 60).trim()}…`;
      }
    }
    if (score === 0) continue;
    const recency = recents.indexOf(doc.id);
    if (recency >= 0) score += Math.max(0, 12 - recency * 2);
    hits.push({ id: doc.id, type: doc.type, status: doc.status, title: doc.title, score, snippet });
  }
  return hits.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}

export async function paletteSearch(projectRoot: string, raw: string, recents: string[] = []): Promise<PaletteResult> {
  const veriDir = join(projectRoot, 'veri');
  if (!existsSync(veriDir)) throw new Error(`no veri/ directory under ${projectRoot}`);
  const query = parsePaletteQuery(raw);
  const { documents } = await loadProject(veriDir);
  return { query, hits: rankDocs(documents, query, recents) };
}
