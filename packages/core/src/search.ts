import { compareIds } from './ids.ts';
import type { DocType } from './ids.ts';
import type { VeriDocument } from './types.ts';

// ---- Palette search (WO-013, SRC-005 layer 2) ----------------------------
// Ranked matching shared by the UI palette, the Search view, and the MCP
// `search` tool (DEC-044, WO-090): one scoring implementation, no second
// algorithm to drift (DEC-009: no second index). Moved here from
// packages/mcp per DEC-104 — pure domain logic over VeriDocument[], below
// every surface; mcp re-exports these names so its public API is unchanged.

const TYPE_PREFIX: Record<string, DocType> = {
  req: 'requirement',
  dec: 'decision',
  wo: 'work-order',
  src: 'source',
  wf: 'workflow',
  met: 'method',
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
  /** From `related:ID` (WO-048, SRC-022) — lowercased id; last one wins.
      Narrows hits to the id's 1-hop link neighborhood plus the id itself. */
  related: string | null;
}

export interface PaletteHit {
  id: string;
  type: string;
  status: string;
  title: string;
  score: number;
  /** Where the query landed: id tier, or per-term title/body hits (WO-090).
      Empty for the empty-text base score. */
  matched: Array<'id' | 'title' | 'body'>;
  /** One-line context around the first body-matched term; null when the
      match is entirely id/title. */
  snippet: string | null;
  /** The document's declared epistemic kind (REQ-032 requirements, REQ-038
      sources), when it declares one — surfaces render effective defaults
      via requirementKind/sourceKind themselves. */
  kind?: string;
}

export interface PaletteResult {
  query: PaletteQuery;
  hits: PaletteHit[];
}

export function parsePaletteQuery(raw: string): PaletteQuery {
  let type: DocType | null = null;
  let related: string | null = null;
  const statuses: string[] = [];
  const text = raw
    .toLowerCase()
    // `related:` first — its value must not feed the type-prefix pass.
    .replace(/\brelated:([a-z0-9-]*)/g, (_m, id: string) => {
      related = id;
      return ' ';
    })
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
  return { text, type, statuses, related };
}

/** Every id a document points at: frontmatter links, the supersession
    pointer, and inline [[refs]] — the same edge set buildGraph derives and
    the Connections panel shows (SRC-022). */
function docTargets(doc: VeriDocument): string[] {
  const targets = doc.links.map((link) => link.id);
  if (doc.supersededBy !== undefined) targets.push(doc.supersededBy);
  targets.push(...doc.inlineRefs);
  return targets;
}

/**
 * The 1-hop neighborhood of `id` (WO-048, SRC-022), as lowercased ids:
 * documents it links to, documents linking to it — both directions over
 * frontmatter links and inline refs — plus the id itself. An id no document
 * carries yields the empty set: zero hits, never an error.
 */
export function relatedIds(documents: VeriDocument[], id: string): Set<string> {
  const center = id.toLowerCase();
  const hood = new Set<string>();
  if (!documents.some((doc) => doc.id.toLowerCase() === center)) return hood;
  hood.add(center);
  for (const doc of documents) {
    const docId = doc.id.toLowerCase();
    const targets = docTargets(doc).map((t) => t.toLowerCase());
    if (docId === center) for (const t of targets) hood.add(t);
    else if (targets.includes(center)) hood.add(docId);
  }
  return hood;
}

/** Score tiers (WO-090). Id tiers dominate everything else; term tiers sum
    across AND-matched terms (whole word above bare substring, title above
    body); phrase bonuses reward the full query appearing intact in a title. */
const SCORE = {
  idExact: 1000,
  idPrefix: 800,
  titleWord: 100,
  titleSub: 80,
  bodyWord: 40,
  bodySub: 30,
  phraseTitleStart: 50,
  phraseTitleContain: 25,
} as const;

const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const hasWholeWord = (haystack: string, term: string): boolean =>
  new RegExp(`\\b${escapeRegExp(term)}\\b`).test(haystack);

/**
 * Ranked matching per the SRC-005 handoff, extended by WO-090 to multi-term
 * queries: exact id (zero-padding optional, so `req14` → REQ-014) → id
 * prefix → per-term scoring. Free text splits on whitespace; every term must
 * match title or body (AND), and the score sums the terms' best tiers —
 * whole-word beats substring, title beats body — plus a bonus when the full
 * phrase sits in the title. Recently opened docs get a fading boost. Empty
 * text scores every filter-surviving doc 1, so `wo:` alone lists all work
 * orders and an empty palette floats the recents. Ordering is deterministic:
 * score, then id.
 */
export function rankDocs(documents: VeriDocument[], query: PaletteQuery, recents: string[] = []): PaletteHit[] {
  const qId = query.text.replace(/[^a-z0-9]/g, '');
  const terms = query.text === '' ? [] : query.text.split(' ');
  const hood = query.related === null ? null : relatedIds(documents, query.related);
  const hits: PaletteHit[] = [];
  for (const doc of documents) {
    if (hood !== null && !hood.has(doc.id.toLowerCase())) continue;
    if (query.type !== null && doc.type !== query.type) continue;
    const status = doc.status.toLowerCase().replace(/[^a-z]/g, '');
    if (
      !query.statuses.every(
        (f) => status === f || (f === 'active' && LIVING.has(status)) || (f === 'proposed' && PENDING.has(status)),
      )
    )
      continue;
    const idNorm = doc.id.toLowerCase().replace(/[^a-z0-9]/g, '');
    // Strip zeros only immediately after the prefix, so the unpadded form of
    // REQ-014 is req14 while REQ-1004 stays req1004 — no collision (WO-050).
    const idShort = idNorm.replace(/^([a-z]+)0+(?=\d)/, '$1');
    const title = doc.title.toLowerCase();
    let score = 0;
    let snippet: string | null = null;
    const matched: PaletteHit['matched'] = [];
    if (query.text === '') {
      score = 1;
    } else if (qId !== '' && (idNorm === qId || idShort === qId)) {
      score = SCORE.idExact;
      matched.push('id');
    } else if (qId !== '' && idNorm.startsWith(qId)) {
      score = SCORE.idPrefix;
      matched.push('id');
    } else {
      // Per-term AND matching: every term must land somewhere, each term
      // contributes its best tier only.
      const body = doc.body.replace(/\s+/g, ' ');
      const bodyLower = body.toLowerCase();
      let allTermsMatch = true;
      for (const term of terms) {
        if (title.includes(term)) {
          score += hasWholeWord(title, term) ? SCORE.titleWord : SCORE.titleSub;
          if (!matched.includes('title')) matched.push('title');
        } else {
          const at = bodyLower.indexOf(term);
          if (at < 0) {
            allTermsMatch = false;
            break;
          }
          score += hasWholeWord(bodyLower, term) ? SCORE.bodyWord : SCORE.bodySub;
          if (!matched.includes('body')) matched.push('body');
          if (snippet === null) snippet = `…${body.slice(Math.max(0, at - 20), at + 60).trim()}…`;
        }
      }
      if (!allTermsMatch) continue;
      if (title.startsWith(query.text)) score += SCORE.phraseTitleStart;
      else if (title.includes(query.text)) score += SCORE.phraseTitleContain;
    }
    if (score === 0) continue;
    const recency = recents.indexOf(doc.id);
    if (recency >= 0) score += Math.max(0, 12 - recency * 2);
    hits.push({
      id: doc.id,
      type: doc.type,
      status: doc.status,
      title: doc.title,
      score,
      matched,
      snippet,
      ...(doc.kind !== undefined ? { kind: doc.kind } : {}),
    });
  }
  return hits.sort((a, b) => b.score - a.score || compareIds(a.id, b.id));
}
