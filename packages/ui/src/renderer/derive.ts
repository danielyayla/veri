/**
 * Pure view-model derivation from a Snapshot. No DOM, no IPC — everything here
 * is computed from what @veri/core already parsed and checked.
 */
import type { Edge, Issue, VeriDocument } from '@veri/core';
import type { Snapshot } from '../lib/snapshot.ts';
import { sections, parseBlocks, plainText } from './markdown.ts';
import type { Block } from './markdown.ts';

export type DocsById = Map<string, VeriDocument>;

export function docsById(snap: Snapshot): DocsById {
  return new Map(snap.documents.map((d) => [d.id, d]));
}

export function issueFiles(issue: Issue): string[] {
  return issue.kind === 'duplicate-id' ? issue.files : [issue.file];
}

/** Issues keyed by document id (via the file they were reported on). */
export function issuesByDoc(snap: Snapshot): Map<string, Issue[]> {
  const byFile = new Map<string, VeriDocument>(snap.documents.map((d) => [d.file, d]));
  const out = new Map<string, Issue[]>();
  for (const issue of snap.issues) {
    for (const file of issueFiles(issue)) {
      const doc = byFile.get(file);
      if (doc === undefined) continue;
      const list = out.get(doc.id) ?? [];
      list.push(issue);
      out.set(doc.id, list);
    }
  }
  return out;
}

/** The doc an issue row should navigate to (first affected file's doc). */
export function issueDocId(snap: Snapshot, issue: Issue): string | null {
  const byFile = new Map<string, VeriDocument>(snap.documents.map((d) => [d.file, d]));
  for (const file of issueFiles(issue)) {
    const doc = byFile.get(file);
    if (doc !== undefined) return doc.id;
  }
  return null;
}

export interface Connection {
  id: string;
  title: string;
  type: VeriDocument['type'];
  why: string;
}

export interface ConnectionGroups {
  outbound: Connection[];
  inbound: Connection[];
}

export function connections(snap: Snapshot, id: string): ConnectionGroups {
  const byId = docsById(snap);
  const seenOut = new Set<string>();
  const outbound: Connection[] = [];
  const seenIn = new Set<string>();
  const inbound: Connection[] = [];
  for (const edge of snap.edges) {
    if (edge.from === id) {
      const target = byId.get(edge.to);
      if (target === undefined || seenOut.has(edge.to)) continue;
      seenOut.add(edge.to);
      outbound.push({ id: edge.to, title: target.title, type: target.type, why: edge.rel });
    } else if (edge.to === id) {
      const source = byId.get(edge.from);
      if (source === undefined || seenIn.has(edge.from)) continue;
      seenIn.add(edge.from);
      inbound.push({ id: edge.from, title: source.title, type: source.type, why: edge.rel });
    }
  }
  return { outbound, inbound };
}

export interface Receipt {
  date: string;
  commit: string;
  files: string[];
  summary: string;
  agent: boolean;
}

const AGENT_RE = /\b(claude|agent|copilot|codex)\b/i;

/** Parse "- date — commit — files — summary" receipt lines (DEC-003 shape). */
export function receipts(doc: VeriDocument): Receipt[] {
  const section = sections(doc.body).get('Receipts') ?? [];
  const out: Receipt[] = [];
  for (const block of section) {
    if (block.kind !== 'li') continue;
    const text = plainText(block.segs);
    const parts = text.split(' — ');
    if (parts.length < 4) continue;
    out.push({
      date: parts[0],
      commit: parts[1],
      files: parts[2].split(',').map((f) => f.trim()).filter((f) => f !== ''),
      summary: parts.slice(3).join(' — '),
      agent: AGENT_RE.test(text),
    });
  }
  return out;
}

export interface BoardCard {
  id: string;
  title: string;
  reqCount: number;
  agent: boolean;
  health: boolean;
}

export interface BoardColumn {
  status: 'backlog' | 'in-progress' | 'done';
  label: string;
  cards: BoardCard[];
}

export function boardColumns(snap: Snapshot): BoardColumn[] {
  const issues = issuesByDoc(snap);
  const cols: BoardColumn[] = [
    { status: 'backlog', label: 'BACKLOG', cards: [] },
    { status: 'in-progress', label: 'IN PROGRESS', cards: [] },
    { status: 'done', label: 'DONE', cards: [] },
  ];
  const workOrders = snap.documents
    .filter((d) => d.type === 'work-order')
    .sort((a, b) => a.id.localeCompare(b.id));
  for (const wo of workOrders) {
    const col = cols.find((c) => c.status === wo.status) ?? cols[0];
    col.cards.push({
      id: wo.id,
      title: wo.title,
      reqCount: wo.links.filter((l) => l.id.startsWith('REQ-')).length,
      agent: receipts(wo).some((r) => r.agent),
      health: (issues.get(wo.id) ?? []).length > 0,
    });
  }
  return cols;
}

export interface DecisionEntry {
  id: string;
  date: string;
  title: string;
  status: string;
  choice: string;
  rejected: string[];
  links: Array<{ id: string; type: VeriDocument['type'] }>;
  supersededBy: string | null;
}

/** Chip label for a rejected alternative: its **bold** lead-in, else a trimmed prefix. */
export function rejectedLabel(block: Block): string {
  if (block.kind !== 'li') return '';
  const bold = block.segs.find((s) => s.kind === 'bold');
  if (bold !== undefined && bold.kind === 'bold') return bold.text;
  const text = plainText(block.segs);
  const dash = text.indexOf(' — ');
  const head = dash >= 0 ? text.slice(0, dash) : text;
  return head.length > 42 ? `${head.slice(0, 39)}…` : head;
}

export function decisionLog(snap: Snapshot): DecisionEntry[] {
  const byId = docsById(snap);
  return snap.documents
    .filter((d) => d.type === 'decision')
    .sort((a, b) => (a.created === b.created ? b.id.localeCompare(a.id) : b.created.localeCompare(a.created)))
    .map((d) => {
      const secs = sections(d.body);
      const choiceBlock = (secs.get('Choice') ?? []).find((b) => b.kind === 'para');
      const rejected = (secs.get('Rejected alternatives') ?? [])
        .filter((b) => b.kind === 'li')
        .map((b) => rejectedLabel(b));
      return {
        id: d.id,
        date: d.created,
        title: d.title,
        status: d.status,
        choice: choiceBlock !== undefined && choiceBlock.kind === 'para' ? plainText(choiceBlock.segs) : '',
        rejected,
        links: d.links
          .filter((l) => byId.has(l.id))
          .map((l) => ({ id: l.id, type: byId.get(l.id)!.type })),
        supersededBy: d.supersededBy ?? null,
      };
    });
}

export interface GraphNode {
  id: string;
  type: VeriDocument['type'];
  title: string;
  status: string;
  x: number;
  y: number;
  size: number;
  degree: number;
  dim: boolean;
}

export interface GraphEdgeLine {
  from: string;
  to: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface GraphLayout {
  nodes: GraphNode[];
  lines: GraphEdgeLine[];
}

/**
 * Deterministic layout in the mockup's shape: requirements left, decisions
 * center, work orders right, sources along the bottom. Node size by degree.
 */
export function graphLayout(snap: Snapshot): GraphLayout {
  const degree = new Map<string, number>();
  const seenPair = new Set<string>();
  const pairs: Array<[string, string]> = [];
  const ids = new Set(snap.documents.map((d) => d.id));
  for (const edge of snap.edges) {
    if (!ids.has(edge.from) || !ids.has(edge.to) || edge.from === edge.to) continue;
    const key = edge.from < edge.to ? `${edge.from}|${edge.to}` : `${edge.to}|${edge.from}`;
    if (seenPair.has(key)) continue;
    seenPair.add(key);
    pairs.push([edge.from, edge.to]);
    degree.set(edge.from, (degree.get(edge.from) ?? 0) + 1);
    degree.set(edge.to, (degree.get(edge.to) ?? 0) + 1);
  }

  const bands: Record<VeriDocument['type'], { x: [number, number]; y: [number, number] }> = {
    requirement: { x: [13, 27], y: [16, 84] },
    decision: { x: [40, 58], y: [12, 86] },
    'work-order': { x: [68, 86], y: [14, 80] },
    source: { x: [30, 64], y: [88, 90] },
  };

  const nodes: GraphNode[] = [];
  const pos = new Map<string, { x: number; y: number }>();
  for (const type of ['requirement', 'decision', 'work-order', 'source'] as const) {
    const docs = snap.documents.filter((d) => d.type === type).sort((a, b) => a.id.localeCompare(b.id));
    const band = bands[type];
    docs.forEach((d, i) => {
      const t = docs.length === 1 ? 0.5 : i / (docs.length - 1);
      const x = type === 'source'
        ? band.x[0] + t * (band.x[1] - band.x[0])
        : band.x[0] + (i % 2) * (band.x[1] - band.x[0]);
      const y = type === 'source'
        ? band.y[0] + (i % 2) * (band.y[1] - band.y[0])
        : band.y[0] + t * (band.y[1] - band.y[0]);
      const deg = degree.get(d.id) ?? 0;
      pos.set(d.id, { x, y });
      nodes.push({
        id: d.id,
        type,
        title: d.title,
        status: d.status,
        x,
        y,
        size: 10 + Math.min(deg, 5) * 2.4,
        degree: deg,
        dim: d.status === 'superseded',
      });
    });
  }

  const lines: GraphEdgeLine[] = pairs.map(([from, to]) => {
    const a = pos.get(from)!;
    const b = pos.get(to)!;
    return { from, to, x1: a.x, y1: a.y, x2: b.x, y2: b.y };
  });
  return { nodes, lines };
}

export interface PackageRow {
  id: string;
  title: string;
  type: VeriDocument['type'] | 'conventions';
  tokens: number;
}

export interface PackageSummary {
  rows: PackageRow[];
  docCount: number;
  totalTokens: number;
}

const CONVENTIONS_ROW_RE = /^## Project conventions \(CLAUDE\.md\) · ~(\d+) tokens$/;
const DOC_ROW_RE = /^#{2,3} (?:Work order )?((?:REQ|DEC|WO|SRC)-\d{3}) — (.+) · [^·]+ · ~(\d+) tokens$/;
const HEADER_RE = /^\((\d+) docs · ~(\d+) tokens\)$/;

const TYPE_OF_PREFIX: Record<string, VeriDocument['type']> = {
  REQ: 'requirement',
  DEC: 'decision',
  WO: 'work-order',
  SRC: 'source',
};

/**
 * The panel's doc list, parsed out of the exact markdown `get_context` returns —
 * derived from the package text itself so list, order, and estimates can never
 * drift from what an agent receives.
 */
export function packageSummary(packageText: string): PackageSummary {
  const rows: PackageRow[] = [];
  let docCount = 0;
  let totalTokens = 0;
  for (const line of packageText.split('\n')) {
    const header = HEADER_RE.exec(line);
    if (header !== null) {
      docCount = Number.parseInt(header[1], 10);
      totalTokens = Number.parseInt(header[2], 10);
      continue;
    }
    const conventions = CONVENTIONS_ROW_RE.exec(line);
    if (conventions !== null) {
      rows.push({ id: 'CLAUDE.md', title: 'Project conventions', type: 'conventions', tokens: Number.parseInt(conventions[1], 10) });
      continue;
    }
    const doc = DOC_ROW_RE.exec(line);
    if (doc !== null) {
      rows.push({
        id: doc[1],
        title: doc[2],
        type: TYPE_OF_PREFIX[doc[1].split('-')[0]],
        tokens: Number.parseInt(doc[3], 10),
      });
    }
  }
  return { rows, docCount, totalTokens };
}

export interface ActivityRow {
  agent: boolean;
  text: string;
  time: string;
}

/** File-derived activity: receipts (sessions) plus the last-updated stamp. */
export function fileActivity(doc: VeriDocument, rel: (date: string) => string): ActivityRow[] {
  const rows: ActivityRow[] = [];
  for (const r of receipts(doc).slice().reverse()) {
    rows.push({
      agent: r.agent,
      text: `Receipt filed: commit ${r.commit} · ${r.files.length} file${r.files.length === 1 ? '' : 's'}`,
      time: rel(r.date),
    });
  }
  rows.push({ agent: false, text: 'Last edited', time: rel(doc.updated) });
  return rows;
}

// ---- Home view derivations (WO-015, SRC-005 layer 4) ---------------------

export interface HomeFlightRow {
  id: string;
  title: string;
  status: string;
  reqCount: number;
  agent: boolean;
}

/** IN FLIGHT: work orders in backlog/in-progress, id order, with the
    Board's receipt-derived agent marker and linked-REQ count. */
export function inFlight(snap: Snapshot): HomeFlightRow[] {
  return snap.documents
    .filter((d) => d.type === 'work-order' && (d.status === 'backlog' || d.status === 'in-progress'))
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((wo) => ({
      id: wo.id,
      title: wo.title,
      status: wo.status,
      reqCount: wo.links.filter((l) => l.id.startsWith('REQ-')).length,
      agent: receipts(wo).some((r) => r.agent),
    }));
}

export interface HomeActivityRow {
  id: string;
  text: string;
  time: string;
  /** YYYY-MM-DD sort key; session rows pass today's date. */
  date: string;
}

/**
 * AGENT ACTIVITY: the project-wide write-back feed — receipts on every work
 * order plus filed decisions, newest first. In-memory session rows are merged
 * in by the view (they carry no file date). Capped: a feed, not an archive.
 */
export function projectActivity(snap: Snapshot, rel: (date: string) => string, cap = 8): HomeActivityRow[] {
  const rows: HomeActivityRow[] = [];
  for (const doc of snap.documents) {
    if (doc.type === 'work-order') {
      for (const r of receipts(doc)) {
        rows.push({
          id: doc.id,
          text: `Receipt filed: commit ${r.commit} · ${r.files.length} file${r.files.length === 1 ? '' : 's'}`,
          time: rel(r.date),
          date: r.date,
        });
      }
    } else if (doc.type === 'decision') {
      rows.push({ id: doc.id, text: `Decision filed: ${doc.title}`, time: rel(doc.created), date: doc.created });
    }
  }
  return rows.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)).slice(0, cap);
}

export interface ChangedRow {
  id: string;
  title: string;
  time: string;
}

/** RECENTLY CHANGED: docs by `updated` desc, so external and agent edits
    surface without hunting. */
export function recentlyChanged(snap: Snapshot, rel: (date: string) => string, cap = 8): ChangedRow[] {
  return snap.documents
    .slice()
    .sort((a, b) => b.updated.localeCompare(a.updated) || b.id.localeCompare(a.id))
    .slice(0, cap)
    .map((d) => ({ id: d.id, title: d.title, time: rel(d.updated) }));
}

export interface AutocompleteItem {
  id: string;
  title: string;
  type: VeriDocument['type'];
}

/** Matches for the `[[` autocomplete: every id in the project, filtered. */
export function autocomplete(snap: Snapshot, text: string): AutocompleteItem[] | null {
  const m = /\[\[([^\]]*)$/.exec(text);
  if (m === null) return null;
  const q = m[1].toLowerCase();
  return snap.documents
    .filter((d) => `${d.id} ${d.title}`.toLowerCase().includes(q))
    .sort((a, b) => a.id.localeCompare(b.id))
    .slice(0, 6)
    .map((d) => ({ id: d.id, title: d.title, type: d.type }));
}

export function insertAutocomplete(text: string, id: string): string {
  return text.replace(/\[\[([^\]]*)$/, `[[${id}]] `);
}

/**
 * The agent-neutral kickoff prompt (REQ-007). Exact template from the
 * SRC-003 design — plain text, no markdown, no provider names. Used verbatim
 * by Copy kickoff prompt and as the launch prompt for Start agent session.
 */
export function kickoffPrompt(id: string, title: string): string {
  return (
    `Implement ${id} — ${title}.\n` +
    `Before writing any code, fetch the full context package with the Veri ` +
    `MCP tool: get_context("${id}"). Follow the linked decisions and stay ` +
    `inside the work order's scope.`
  );
}
