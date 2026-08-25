/**
 * Architecture view derivation (WO-068, SRC-036). Pure — no DOM, no IPC:
 * everything derives from what the snapshot already carries (the compiled
 * projection, the host-collected observed facts, and the severity-routed
 * findings in issues/advisories). Provenance is never blurred: declared
 * facts come from `architecture` (decisions), discovered ones from
 * `archObserved` (the repository scan), and every row here says which.
 */
import type { Advisory, ArchConflict, ArchRule, ModuleEntry, VeriDocument } from '@veri/core';
import { compareIds } from '@veri/core/ids';
import type { ModuleFileFact } from '@veri/cli';
import type { Snapshot } from '../lib/snapshot.ts';
import type { DocsById } from './derive.ts';

export type ArchFinding = Extract<Advisory, { kind: 'arch-violation' }>;

/** The view's one input: the snapshot's architecture surfaces, pre-split. */
export interface ArchModel {
  modules: ModuleEntry[];
  /** Module names whose path was scanned (not in skipped). */
  onDisk: Set<string>;
  rules: ArchRule[];
  conflicts: ArchConflict[];
  observed: AggEdge[];
  files: ModuleFileFact[];
  exports: Record<string, string[]>;
  /** Error-severity violations — check issues (DEC-062), amber everywhere. */
  errors: ArchFinding[];
  /** Advisory-severity violations — the grey tier (DEC-025), hollow everywhere. */
  advisories: ArchFinding[];
}

/** One observed from→to pair with its import count (per-file rows collapse). */
export interface AggEdge {
  from: string;
  to: string;
  count: number;
}

export function aggregateEdges(edges: Array<{ from: string; to: string }>): AggEdge[] {
  const out: AggEdge[] = [];
  const at = new Map<string, AggEdge>();
  for (const edge of edges) {
    const key = `${edge.from}\x00${edge.to}`;
    const hit = at.get(key);
    if (hit !== undefined) hit.count++;
    else {
      const agg = { from: edge.from, to: edge.to, count: 1 };
      at.set(key, agg);
      out.push(agg);
    }
  }
  return out;
}

export function archModel(snap: Snapshot): ArchModel {
  const skipped = new Set(snap.archObserved.skipped.map((entry) => entry.name));
  return {
    modules: snap.architecture.modules,
    onDisk: new Set(snap.architecture.modules.map((entry) => entry.name).filter((name) => !skipped.has(name))),
    rules: snap.architecture.rules,
    conflicts: snap.architecture.conflicts,
    observed: aggregateEdges(snap.archObserved.edges),
    files: snap.archObserved.files,
    exports: snap.archObserved.exports,
    errors: snap.issues.filter((issue): issue is ArchFinding => issue.kind === 'arch-violation'),
    advisories: snap.advisories.filter((advisory): advisory is ArchFinding => advisory.kind === 'arch-violation'),
  };
}

const pairKey = (from: string, to: string): string => `${from}\x00${to}`;

function findingPairs(findings: ArchFinding[]): Set<string> {
  return new Set(findings.map((finding) => pairKey(finding.from, finding.to)));
}

/** The tier an edge renders at — conflict outranks error outranks advisory. */
export function edgeTier(model: ArchModel, from: string, to: string): 'conflict' | 'error' | 'advisory' | null {
  if (model.conflicts.some((c) => c.from === from && c.to === to)) return 'conflict';
  if (findingPairs(model.errors).has(pairKey(from, to))) return 'error';
  if (findingPairs(model.advisories).has(pairKey(from, to))) return 'advisory';
  return null;
}

// ---- Map layout (DEC-088, proposed) ---------------------------------------

export const CARD_W = 172;
export const CARD_H = 92;
const GAP_X = 56;
const GAP_Y = 64;
const PAD_X = 32;
const PAD_Y = 20;

/**
 * Dependency depth of each module over the observed edges: 0 imports
 * nothing, otherwise 1 + the deepest dependency. Cycles are cut at the
 * back-edge in deterministic walk order (registry order, edges in collected
 * order), so the same snapshot always yields the same layers (DEC-088).
 */
export function moduleDepths(names: string[], observed: AggEdge[]): Map<string, number> {
  const known = new Set(names);
  const deps = new Map<string, string[]>();
  for (const name of names) deps.set(name, []);
  for (const edge of observed) {
    if (known.has(edge.from) && known.has(edge.to) && edge.from !== edge.to) deps.get(edge.from)!.push(edge.to);
  }
  const depth = new Map<string, number>();
  const stack = new Set<string>();
  const walk = (name: string): number => {
    const done = depth.get(name);
    if (done !== undefined) return done;
    if (stack.has(name)) return 0; // cycle: cut at the back-edge
    stack.add(name);
    let deepest = -1;
    for (const dep of deps.get(name) ?? []) deepest = Math.max(deepest, walk(dep));
    stack.delete(name);
    const d = deepest + 1;
    depth.set(name, d);
    return d;
  };
  for (const name of names) walk(name);
  return depth;
}

/** Rows top-down: things that depend sit above the things they depend on
    (SRC-036). Within a row, registry declaration order. */
export function layerModules(names: string[], observed: AggEdge[]): string[][] {
  const depth = moduleDepths(names, observed);
  const max = Math.max(0, ...names.map((name) => depth.get(name) ?? 0));
  const rows: string[][] = Array.from({ length: max + 1 }, () => []);
  for (const name of names) rows[max - (depth.get(name) ?? 0)].push(name);
  return rows.filter((row) => row.length > 0);
}

export interface MapLayout {
  width: number;
  height: number;
  pos: Map<string, { x: number; y: number }>;
}

/** Deterministic depth-layered placement — no physics, no randomness. */
export function mapLayout(names: string[], observed: AggEdge[]): MapLayout {
  const rows = layerModules(names, observed);
  const pos = new Map<string, { x: number; y: number }>();
  let width = 0;
  rows.forEach((row, r) => {
    row.forEach((name, c) => {
      pos.set(name, { x: PAD_X + c * (CARD_W + GAP_X), y: PAD_Y + r * (CARD_H + GAP_Y) });
    });
    width = Math.max(width, PAD_X * 2 + row.length * CARD_W + (row.length - 1) * GAP_X);
  });
  return { width, height: PAD_Y * 2 + rows.length * CARD_H + Math.max(0, rows.length - 1) * GAP_Y, pos };
}

export interface EdgeGeometry {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  mx: number;
  my: number;
}

/** A straight edge between two card centers, trimmed clear of the cards. */
export function edgeGeometry(a: { x: number; y: number }, b: { x: number; y: number }): EdgeGeometry {
  const ax = a.x + CARD_W / 2;
  const ay = a.y + CARD_H / 2;
  const bx = b.x + CARD_W / 2;
  const by = b.y + CARD_H / 2;
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  const t1 = Math.min(52, len * 0.3);
  const t2 = Math.min(60, len * 0.35);
  const x1 = ax + (dx / len) * t1;
  const y1 = ay + (dy / len) * t1;
  const x2 = bx - (dx / len) * t2;
  const y2 = by - (dy / len) * t2;
  return { x1, y1, x2, y2, mx: (x1 + x2) / 2, my: (y1 + y2) / 2 };
}

// ---- Rules lattice --------------------------------------------------------

export type LatticeCell =
  | { kind: 'self' }
  | { kind: 'unconstrained' }
  | { kind: 'conflict'; allowedBy: string[]; forbiddenBy: string[] }
  | {
      kind: 'rule';
      allowed: boolean;
      /** The anchoring decision: oldest forbidding for a forbidden edge
          (DEC-061's anchor), oldest allowing otherwise. */
      decisionId: string;
      /** Strictest declared severity across agreeing rules (DEC-086). */
      severity: 'advisory' | 'error';
      violations: number;
      violTier: 'advisory' | 'error' | null;
    };

export function latticeCell(model: ArchModel, from: string, to: string): LatticeCell {
  if (from === to) return { kind: 'self' };
  const conflict = model.conflicts.find((c) => c.from === from && c.to === to);
  if (conflict !== undefined) {
    return { kind: 'conflict', allowedBy: conflict.allowedBy, forbiddenBy: conflict.forbiddenBy };
  }
  const rules = model.rules.filter((rule) => rule.from === from && rule.to === to);
  if (rules.length === 0) return { kind: 'unconstrained' };
  const allowed = rules.every((rule) => rule.allowed); // mixed pairs are conflicts, handled above
  const anchors = rules.map((rule) => rule.decisionId).sort(compareIds);
  const errorTier = model.errors.filter((v) => v.from === from && v.to === to).length;
  const advisoryTier = model.advisories.filter((v) => v.from === from && v.to === to).length;
  return {
    kind: 'rule',
    allowed,
    decisionId: anchors[0],
    severity: rules.some((rule) => rule.severity === 'error') ? 'error' : 'advisory',
    violations: errorTier + advisoryTier,
    violTier: errorTier > 0 ? 'error' : advisoryTier > 0 ? 'advisory' : null,
  };
}

// ---- Module detail --------------------------------------------------------

export interface DepRow {
  other: string;
  count: number;
  provenance: 'observed' | 'declared' | 'declared + observed';
  /** Violation marker on this edge, by severity — null when the edge is fine. */
  viol: 'advisory' | 'error' | null;
  conflict: boolean;
}

/** Observed dependency rows for one module, with provenance chips. Declared
    rules with no observed traffic are guardrails, not dependencies — they
    live on the map and in the lattice, not here (per the SRC-036 anatomy). */
export function moduleDeps(model: ArchModel, name: string): { out: DepRow[]; in: DepRow[] } {
  const row = (edge: AggEdge, other: string): DepRow => {
    const declared = model.rules.some((rule) => rule.from === edge.from && rule.to === edge.to);
    const tier = edgeTier(model, edge.from, edge.to);
    return {
      other,
      count: edge.count,
      provenance: declared ? 'declared + observed' : 'observed',
      viol: tier === 'error' || tier === 'advisory' ? tier : null,
      conflict: tier === 'conflict',
    };
  };
  return {
    out: model.observed.filter((edge) => edge.from === name).map((edge) => row(edge, edge.to)),
    in: model.observed.filter((edge) => edge.to === name).map((edge) => row(edge, edge.from)),
  };
}

/** Decisions whose constraints (or conflicts) name this module, id order. */
export function governingDecisions(model: ArchModel, name: string): string[] {
  const ids = new Set<string>();
  for (const rule of model.rules) {
    if (rule.from === name || rule.to === name) ids.add(rule.decisionId);
  }
  for (const conflict of model.conflicts) {
    if (conflict.from === name || conflict.to === name) {
      for (const id of [...conflict.allowedBy, ...conflict.forbiddenBy]) ids.add(id);
    }
  }
  return [...ids].sort(compareIds);
}

/** Requirements those decisions link — derived, like every "related" row. */
export function relatedRequirements(byId: DocsById, decisionIds: string[]): string[] {
  const ids = new Set<string>();
  for (const decId of decisionIds) {
    for (const link of byId.get(decId)?.links ?? []) {
      if (byId.get(link.id)?.type === 'requirement') ids.add(link.id);
    }
  }
  return [...ids].sort(compareIds);
}

// ---- Contents drill-down --------------------------------------------------

export interface TreeRow {
  name: string;
  kind: 'dir' | 'file';
  /** Files beneath a directory, or import specifiers in a file. */
  fileCount: number;
  imports: string[];
}

/** Module-relative path of a scanned file, or null if outside the module path. */
function relPath(fact: ModuleFileFact, modulePath: string): string | null {
  const prefix = modulePath.replace(/\/+$/, '') + '/';
  return fact.file.startsWith(prefix) ? fact.file.slice(prefix.length) : null;
}

/**
 * One level of the contents drill-down (system → module → directory → file):
 * the entries directly under `drill` (a directory path inside the module),
 * directories first in byte order, then files. A file row carries the import
 * specifiers the scan already holds — read-only navigation, no rescans.
 */
export function listDir(files: ModuleFileFact[], moduleName: string, modulePath: string, drill: string[]): TreeRow[] {
  const dirs = new Map<string, number>();
  const rows: TreeRow[] = [];
  for (const fact of files) {
    if (fact.module !== moduleName) continue;
    const rel = relPath(fact, modulePath);
    if (rel === null) continue;
    const segs = rel.split('/');
    if (segs.length < drill.length + 1) continue;
    if (!drill.every((seg, i) => segs[i] === seg)) continue;
    const head = segs[drill.length];
    if (segs.length === drill.length + 1) {
      rows.push({ name: head, kind: 'file', fileCount: fact.imports.length, imports: fact.imports });
    } else {
      dirs.set(head, (dirs.get(head) ?? 0) + 1);
    }
  }
  const byte = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
  return [
    ...[...dirs.entries()]
      .sort((a, b) => byte(a[0], b[0]))
      .map(([name, count]): TreeRow => ({ name, kind: 'dir', fileCount: count, imports: [] })),
    ...rows.sort((a, b) => byte(a.name, b.name)),
  ];
}

/** How many files the scan attributed to a module (the card's meta). */
export function moduleFileCount(model: ArchModel, name: string): number {
  return model.files.filter((fact) => fact.module === name).length;
}

// ---- Home card + reader card ----------------------------------------------

export interface ArchSummary {
  modules: number;
  constraints: number;
  advisoryViolations: number;
  /** The highest-tier single line (SRC-036): an issue, else the advisory
      aggregate, else the explicit checked-and-clean statement. */
  top:
    | { kind: 'issue'; issueKind: string; text: string }
    | { kind: 'advisory'; text: string }
    | { kind: 'clean'; text: string };
}

export function archSummary(snap: Snapshot): ArchSummary {
  const issue = snap.issues.find((i) => i.kind === 'arch-conflict' || i.kind === 'arch-violation');
  const advisories = snap.advisories.filter((a) => a.kind === 'arch-violation');
  const top: ArchSummary['top'] =
    issue !== undefined
      ? { kind: 'issue', issueKind: issue.kind as string, text: issue.message }
      : advisories.length > 0
        ? {
            kind: 'advisory',
            text:
              advisories.length === 1
                ? '1 observed import crosses a forbidden edge'
                : `${advisories.length} observed imports cross a forbidden edge`,
          }
        : { kind: 'clean', text: 'observed imports respect every active constraint' };
  return {
    modules: snap.architecture.modules.length,
    constraints: snap.architecture.rules.length,
    advisoryViolations: advisories.length,
    top,
  };
}

export interface ReaderRule {
  from: string;
  to: string;
  allowed: boolean;
  severity: 'advisory' | 'error';
  /** Violations of this edge at each tier — the card's observed status. */
  observed: number;
  tier: 'advisory' | 'error' | null;
  conflicted: boolean;
}

/**
 * The reader constraints card's rows (SRC-036): straight from the decision's
 * own `architecture:` frontmatter — proposed and superseded decisions show
 * their declared rules too, they just contribute nothing to the projection.
 * Observed status derives from the snapshot's routed findings.
 */
export function decisionRules(snap: Snapshot, doc: VeriDocument): ReaderRule[] {
  const block = doc.frontmatter['architecture'] as
    | { constraints: Array<{ from: string | string[]; to: string | string[]; allowed: boolean; severity?: string }> }
    | undefined;
  if (block === undefined || doc.type !== 'decision') return [];
  const model = archModel(snap);
  const asList = (ref: string | string[]): string[] => (typeof ref === 'string' ? [ref] : ref);
  const rows: ReaderRule[] = [];
  for (const constraint of block.constraints ?? []) {
    for (const from of asList(constraint.from)) {
      for (const to of asList(constraint.to)) {
        const errors = model.errors.filter((v) => v.from === from && v.to === to).length;
        const advisories = model.advisories.filter((v) => v.from === from && v.to === to).length;
        rows.push({
          from,
          to,
          allowed: constraint.allowed,
          severity: constraint.severity === 'error' ? 'error' : 'advisory',
          observed: errors + advisories,
          tier: errors > 0 ? 'error' : advisories > 0 ? 'advisory' : null,
          conflicted: model.conflicts.some((c) => c.from === from && c.to === to),
        });
      }
    }
  }
  return rows;
}
