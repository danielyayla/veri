/**
 * Pure view-model derivation from a Snapshot. No DOM, no IPC — everything here
 * is computed from what @verikb/core already parsed and checked.
 */
import type { Advisory, Edge, Issue, VeriDocument } from '@verikb/core';
import { compareIds } from '@verikb/core/ids';
import type { Snapshot } from '../lib/snapshot.ts';
import { sections, parseBlocks, plainText } from './markdown.ts';

/**
 * Mirrors @verikb/core's PACKAGE_RULES for the package panel footer. The
 * renderer bundle can't import core's node-flavored runtime, so the string is
 * mirrored here and a drift test asserts equality with the core export
 * (REQ-019) — edit both or the suite fails.
 */
export const PACKAGE_RULES_TEXT =
  'Workflow always first · linked requirements and decisions in full · sources as excerpts · ' +
  'superseded decisions named only · oversized neighborhoods enumerated as a context map';

export type DocsById = Map<string, VeriDocument>;

export function docsById(snap: Snapshot): DocsById {
  return new Map(snap.documents.map((d) => [d.id, d]));
}

export function issueFiles(issue: Issue): string[] {
  return issue.kind === 'duplicate-id' ? issue.files : [issue.file];
}

/** An issue reported on a source file rather than a document — the
    arch-violation issue (DEC-062) — anchors to its governing decision by
    id, so the reader banner lands on the ruling that was violated. */
function issueAnchorId(snap: Snapshot, issue: Issue): string | null {
  if (issue.kind !== 'arch-violation') return null;
  return snap.documents.some((d) => d.id === issue.id) ? issue.id : null;
}

/** Issues keyed by document id (via the file they were reported on). */
export function issuesByDoc(snap: Snapshot): Map<string, Issue[]> {
  const byFile = new Map<string, VeriDocument>(snap.documents.map((d) => [d.file, d]));
  const out = new Map<string, Issue[]>();
  const add = (id: string, issue: Issue): void => {
    const list = out.get(id) ?? [];
    list.push(issue);
    out.set(id, list);
  };
  for (const issue of snap.issues) {
    const anchor = issueAnchorId(snap, issue);
    if (anchor !== null) {
      add(anchor, issue);
      continue;
    }
    for (const file of issueFiles(issue)) {
      const doc = byFile.get(file);
      if (doc !== undefined) add(doc.id, issue);
    }
  }
  return out;
}

/** Advisories keyed by document id (WO-026). An advisory carries the id of
    the document it was reported on; unknown ids (mid-edit races) are dropped. */
export function advisoriesByDoc(snap: Snapshot): Map<string, Advisory[]> {
  const ids = new Set(snap.documents.map((d) => d.id));
  const out = new Map<string, Advisory[]>();
  for (const advisory of snap.advisories) {
    if (!ids.has(advisory.id)) continue;
    const list = out.get(advisory.id) ?? [];
    list.push(advisory);
    out.set(advisory.id, list);
  }
  return out;
}

/** The doc an issue row should navigate to (first affected file's doc; an
    arch-violation issue navigates to its governing decision). */
export function issueDocId(snap: Snapshot, issue: Issue): string | null {
  const anchor = issueAnchorId(snap, issue);
  if (anchor !== null) return anchor;
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

// ---- Local graph on the document (WO-052, SRC-024) -----------------------

/** At most this many neighbors render per side; the rest become `+K more`. */
export const LOCAL_GRAPH_CAP = 8;

/** Vertical pitch between neighbor slots, px. */
const LOCAL_ROW_H = 26;
const LOCAL_PAD_Y = 14;

export interface LocalGraphNode {
  id: string;
  x: number;
  y: number;
}

export interface LocalGraphSide {
  /** Capped, in the panel's own order (closest first — SRC-024). */
  nodes: LocalGraphNode[];
  /** Neighbors beyond the cap; the cards below stay the complete list. */
  more: number;
  /** The `+K more` marker's slot; null when nothing overflows. */
  moreAt: { x: number; y: number } | null;
}

export interface LocalGraphLayout {
  width: number;
  height: number;
  /** Center node — the current document. */
  cx: number;
  cy: number;
  inbound: LocalGraphSide;
  outbound: LocalGraphSide;
}

/**
 * SRC-024: a deterministic two-column fan at panel width — inbound left,
 * outbound right, straight edges center↔neighbor, no simulation. Neighbors
 * are the panel's own deduped `connections()` set. Null when the document
 * has no connections at all: the graph is hidden entirely, no empty-state.
 */
export function localGraph(groups: ConnectionGroups, width = 272): LocalGraphLayout | null {
  if (groups.inbound.length === 0 && groups.outbound.length === 0) return null;
  const slotsOf = (n: number): number => Math.min(n, LOCAL_GRAPH_CAP) + (n > LOCAL_GRAPH_CAP ? 1 : 0);
  const rows = Math.max(slotsOf(groups.inbound.length), slotsOf(groups.outbound.length));
  const height = rows * LOCAL_ROW_H + LOCAL_PAD_Y * 2;
  const cy = height / 2;
  const side = (conns: Connection[], x: number): LocalGraphSide => {
    const shown = conns.slice(0, LOCAL_GRAPH_CAP);
    const more = conns.length - shown.length;
    const slots = shown.length + (more > 0 ? 1 : 0);
    const y = (i: number): number => cy + (i - (slots - 1) / 2) * LOCAL_ROW_H;
    return {
      nodes: shown.map((c, i) => ({ id: c.id, x, y: y(i) })),
      more,
      moreAt: more > 0 ? { x, y: y(slots - 1) } : null,
    };
  };
  return {
    width,
    height,
    cx: width / 2,
    cy,
    inbound: side(groups.inbound, Math.round(width * 0.18)),
    outbound: side(groups.outbound, Math.round(width * 0.82)),
  };
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
  /** Layered assembly (DEC-035, SRC-017): the context map's aggregate —
      how many adjacent documents are enumerated instead of inlined, and
      the map section's own token size. Undefined for inline packages. */
  map?: { count: number; tokens: number };
}

const CONVENTIONS_ROW_RE = /^## Project conventions \(CLAUDE\.md\) · ~(\d+) tokens$/;
// Matches every inlined-doc heading get_context renders, including the
// workflow's `## Workflow · WF-001 — Title · ~N tokens` shape, whose status
// segment is absent (WO-050: WF rows were silently missing from the panel).
const DOC_ROW_RE = /^#{2,3} (?:Work order |Workflow · )?((?:REQ|DEC|WO|SRC|WF)-\d{3,}) — (.+?)(?: · [^·]+)? · ~(\d+) tokens$/;
const HEADER_RE = /^\((\d+) docs · ~(\d+) tokens\)$/;
const MAP_HEADING_RE = /^## Context map — (\d+) adjacent documents, not inlined$/m;

const TYPE_OF_PREFIX: Record<string, VeriDocument['type']> = {
  REQ: 'requirement',
  DEC: 'decision',
  WO: 'work-order',
  SRC: 'source',
  WF: 'workflow',
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
  // The map aggregate derives from the served text like everything else, so
  // the panel can never claim a mode the agent didn't receive (SRC-017).
  const mapAt = MAP_HEADING_RE.exec(packageText);
  if (mapAt === null) return { rows, docCount, totalTokens };
  const rest = packageText.slice(mapAt.index + mapAt[0].length);
  const nextSection = rest.search(/^## /m);
  const section = (nextSection >= 0 ? rest.slice(0, nextSection) : rest).trim();
  return {
    rows,
    docCount,
    totalTokens,
    map: { count: Number.parseInt(mapAt[1], 10), tokens: Math.ceil(section.length / 4) },
  };
}

export interface ActivityRow {
  agent: boolean;
  text: string;
  time: string;
  /** In-memory session log only — lost on restart, never file-derived (WO-062). */
  session?: boolean;
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

/** Awaiting the user's approval, so not binding (REQ-008). Renderer-local
    mirror of core's isPending — the browser can't import @verikb/core at
    runtime (bare specifier, CSP 'self'); core's self-tests keep them in sync. */
export function isPending(doc: VeriDocument): boolean {
  return (
    (doc.type === 'requirement' && doc.status === 'draft') ||
    (doc.type === 'decision' && doc.status === 'proposed')
  );
}

/** NEEDS REVIEW (SRC-006): pending docs, oldest first — the longest-waiting
    proposal is the most urgent, it may be gating work. */
export function pendingDocs(snap: Snapshot): VeriDocument[] {
  return snap.documents
    .filter(isPending)
    .sort((a, b) => (a.created === b.created ? compareIds(a.id, b.id) : a.created.localeCompare(b.created)));
}

/** The pending documents gating a work order: direct frontmatter link
    targets only, per REQ-008. Empty for backlog WOs' purposes too — the
    caller decides what gated means for its status. */
export function gatingDocs(byId: DocsById, doc: VeriDocument): VeriDocument[] {
  if (doc.type !== 'work-order') return [];
  return doc.links
    .map((l) => byId.get(l.id))
    .filter((d): d is VeriDocument => d !== undefined && isPending(d));
}

export interface HomeFlightRow {
  id: string;
  title: string;
  status: string;
  reqCount: number;
  agent: boolean;
  /** Ids of pending docs this WO links to (SRC-006 gate chip). */
  gates: string[];
}

/** IN FLIGHT: work orders in backlog/in-progress, id order, with the
    receipt-derived agent marker and linked-REQ count. */
export function inFlight(snap: Snapshot): HomeFlightRow[] {
  const byId = docsById(snap);
  return snap.documents
    .filter((d) => d.type === 'work-order' && (d.status === 'backlog' || d.status === 'in-progress'))
    .sort((a, b) => compareIds(a.id, b.id))
    .map((wo) => ({
      id: wo.id,
      title: wo.title,
      status: wo.status,
      reqCount: wo.links.filter((l) => l.id.startsWith('REQ-')).length,
      agent: receipts(wo).some((r) => r.agent),
      gates: gatingDocs(byId, wo).map((d) => d.id),
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
  return rows.sort((a, b) => b.date.localeCompare(a.date) || compareIds(b.id, a.id)).slice(0, cap);
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
    .sort((a, b) => b.updated.localeCompare(a.updated) || compareIds(b.id, a.id))
    .slice(0, cap)
    .map((d) => ({ id: d.id, title: d.title, time: rel(d.updated) }));
}

/** Default rel for a new typed link (SRC-028). */
export const DEFAULT_REL = 'relates-to';

/**
 * Every rel value in use across the project's frontmatter links, deduped and
 * sorted — the add-link rel datalist (WO-056). The vocabulary is the
 * author's, derived from the documents, never curated (SRC-016).
 */
export function relsInUse(snap: Snapshot): string[] {
  const rels = new Set<string>();
  for (const doc of snap.documents) {
    for (const link of doc.links) rels.add(link.rel);
  }
  return [...rels].sort((a, b) => a.localeCompare(b));
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
    .sort((a, b) => compareIds(a.id, b.id))
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

/**
 * The import kickoff prompt (DEC-067). Renderer-local mirror of core's
 * importKickoffPrompt — the browser can't import @verikb/core at runtime
 * (bare specifier, CSP 'self'); derive.test.ts holds this to core's truth.
 */
export function importKickoffPrompt(): string {
  return [
    'You are importing existing project knowledge into Veri.',
    'Call the veri MCP tool get_import_instructions and follow it exactly:',
    'read this repo — code layout, git history, ADRs, READMEs, agent docs —',
    'and file what you find as an import manifest, evidence sources, draft',
    'requirements, and proposed decisions. Nothing you file is binding',
    'until the user approves it.',
  ].join('\n');
}

// ---- Brownfield import derivations (WO-075, SRC-039, DEC-068) ------------

/** One import batch: an ordinary source acting as manifest, defined solely
    by inbound imported-via links — no registry, no marker (DEC-068). */
export interface ImportBatch {
  manifest: VeriDocument;
  /** Sources linking the manifest — evidence rows, context not queue. */
  evidence: VeriDocument[];
  /** Requirements and decisions linking the manifest, filing order. */
  claims: VeriDocument[];
  /** Claims no longer draft/proposed — approved or superseded. */
  reviewed: number;
  /** The manifest carries a receipt: the agent's completion signal. */
  complete: boolean;
}

/** Every import batch on disk, newest manifest first. */
export function importBatches(snap: Snapshot): ImportBatch[] {
  const byId = docsById(snap);
  const members = new Map<string, VeriDocument[]>();
  for (const doc of snap.documents) {
    for (const link of doc.links) {
      if (link.rel !== 'imported-via') continue;
      const manifest = byId.get(link.id);
      if (manifest === undefined || manifest.type !== 'source') continue;
      const list = members.get(manifest.id) ?? [];
      list.push(doc);
      members.set(manifest.id, list);
    }
  }
  return [...members.entries()]
    .map(([id, docs]) => {
      const manifest = byId.get(id)!;
      const claims = docs.filter((d) => d.type === 'requirement' || d.type === 'decision');
      return {
        manifest,
        evidence: docs.filter((d) => d.type === 'source'),
        claims,
        reviewed: claims.filter((d) => !isPending(d)).length,
        complete: receipts(manifest).length > 0,
      };
    })
    .sort((a, b) => b.manifest.created.localeCompare(a.manifest.created) || compareIds(b.manifest.id, a.manifest.id));
}

/** The batch the Import view renders: the newest one, or null pre-import. */
export function latestImportBatch(snap: Snapshot): ImportBatch | null {
  return importBatches(snap)[0] ?? null;
}

/** The manifest a document was imported through, or null for ordinary docs
    — drives the review banner's provenance variant (SRC-039 surface 4). */
export function importManifestOf(byId: DocsById, doc: VeriDocument): VeriDocument | null {
  for (const link of doc.links) {
    if (link.rel !== 'imported-via') continue;
    const manifest = byId.get(link.id);
    if (manifest !== undefined && manifest.type === 'source') return manifest;
  }
  return null;
}

/** The evidence sources a mined document derives from, for the banner's
    clickable chips (REQ-024: the evidence is one click away). */
export function importEvidenceOf(byId: DocsById, doc: VeriDocument): VeriDocument[] {
  return doc.links
    .filter((l) => l.rel === 'derived-from')
    .map((l) => byId.get(l.id))
    .filter((d): d is VeriDocument => d !== undefined && d.type === 'source');
}

/** Group label: the manifest title without its conventional prefix — prose,
    display only, never mechanics (DEC-068 rejects title-based semantics). */
export function importGroupLabel(manifest: VeriDocument): string {
  return manifest.title.replace(/^import manifest\s*[—–-]\s*/i, '').trim() || manifest.title;
}
