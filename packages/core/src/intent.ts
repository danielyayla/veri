import type { VeriDocument } from './types.ts';
import type { ModuleEntry } from './schema.ts';
import { parseReceipts } from './provenance.ts';
import { pathMatchesBinds } from './binds.ts';
import { moduleRegistry } from './architecture.ts';
import { buildGraph } from './graph.ts';

/**
 * Code-to-intent lookup (WO-095, REQ-021): from a repo-relative path to the
 * documents that govern it, derived from what the knowledge base already
 * records — work-order code bindings (WO-088), receipt file lists (DEC-003),
 * and the module registry on the workflow document (DEC-059). No code
 * parsing, no index, no git: pure over loaded documents (DEC-040), so every
 * surface — CLI, MCP, a future app panel — serves the identical derivation
 * (DEC-038).
 */

/** How a work order came to touch the path — the ranking axis (DEC-099):
    a binding is a live claim, a receipt a recorded fact, so bindings
    outrank receipts, and both outrank a module-level match. */
export type IntentVia = 'binding' | 'receipt';

export interface IntentMatch {
  id: string;
  title: string;
  status: string;
  via: IntentVia;
  /** The recorded token that matched: a binds pattern or a receipt path. */
  evidence: string;
}

/** A requirement or decision reachable from a matched work order's
    frontmatter links — the intent behind the code. */
export interface GoverningDoc {
  id: string;
  type: string;
  title: string;
  status: string;
  /** Which matched work orders cite it, and under what relation. */
  citedBy: Array<{ workOrder: string; rel: string }>;
}

export interface IntentLookup {
  /** The query path, normalized (no leading ./, no trailing /). */
  path: string;
  /** Matched work orders, bindings before receipts, newest id first
      within each tier. */
  matches: IntentMatch[];
  /** The registry module covering the path, when one does. */
  module?: ModuleEntry;
  governing: GoverningDoc[];
}

const normalize = (path: string): string => path.replace(/^\.\//, '').replace(/\/+$/, '');

/** Does a recorded path token name the query path? Same posture as receipt
    verification's file matching: exact, as a directory either way, or as a
    basename — receipts often name files by basename alone. */
function overlaps(target: string, token: string): boolean {
  const clean = normalize(token);
  return (
    clean === target ||
    clean.startsWith(target + '/') ||
    target.startsWith(clean + '/') ||
    target.endsWith('/' + clean)
  );
}

/** A glob pattern's leading glob-free segments — the directory it
    anchors under. */
function staticPrefix(pattern: string): string {
  const segments = pattern.split('/');
  const at = segments.findIndex((segment) => /[*?]/.test(segment));
  return (at === -1 ? segments : segments.slice(0, at)).join('/');
}

/** A binds pattern claims the query path when the path falls under the
    pattern, or when the pattern's static prefix and the query overlap as
    directories — so a directory query surfaces work orders bound to globs
    inside it. */
function bindingEvidence(target: string, patterns: string[]): string | undefined {
  for (const pattern of patterns) {
    const clean = normalize(pattern);
    if (clean === '') continue;
    if (pathMatchesBinds(target, [clean])) return pattern;
    const prefix = staticPrefix(clean);
    if (prefix !== '' && (prefix === target || prefix.startsWith(target + '/') || target.startsWith(prefix + '/'))) {
      return pattern;
    }
  }
  return undefined;
}

function receiptEvidence(doc: VeriDocument, target: string): string | undefined {
  for (const receipt of parseReceipts(doc.body)) {
    for (const token of receipt.paths) {
      if (overlaps(target, token)) return token;
    }
  }
  return undefined;
}

/** Registry entry covering the path — longest covering path wins, so a
    nested module claims its own files from an enclosing one. */
function coveringModule(modules: ModuleEntry[], target: string): ModuleEntry | undefined {
  let best: ModuleEntry | undefined;
  for (const entry of modules) {
    const root = normalize(entry.path);
    if (target === root || target.startsWith(root + '/')) {
      if (best === undefined || root.length > normalize(best.path).length) best = entry;
    }
  }
  return best;
}

const idNumber = (id: string): number => Number(id.slice(id.indexOf('-') + 1));

export function lookupIntent(documents: VeriDocument[], path: string): IntentLookup {
  const target = normalize(path.trim());
  const graph = buildGraph(documents);

  const matches: IntentMatch[] = [];
  for (const doc of documents) {
    if (doc.type !== 'work-order') continue;
    // A binding is a live claim by in-flight work (WO-088); once the work
    // order is done, its receipts are the record — a lingering broad glob
    // must not outrank the receipt of the work that shipped the file.
    const bound =
      doc.binds === undefined || doc.status === 'done' ? undefined : bindingEvidence(target, doc.binds.paths);
    const evidence = bound ?? receiptEvidence(doc, target);
    if (evidence === undefined) continue;
    matches.push({
      id: doc.id,
      title: doc.title,
      status: doc.status,
      via: bound !== undefined ? 'binding' : 'receipt',
      evidence,
    });
  }
  matches.sort((a, b) =>
    a.via === b.via ? idNumber(b.id) - idNumber(a.id) : a.via === 'binding' ? -1 : 1,
  );

  // Governing documents: requirements and decisions the matched work orders
  // link in frontmatter — deliberate citations, not inline mentions.
  const governing = new Map<string, GoverningDoc>();
  for (const match of matches) {
    for (const edge of graph.outgoing(match.id)) {
      if (edge.via !== 'frontmatter') continue;
      if (!/^(REQ|DEC)-/.test(edge.to)) continue;
      const doc = graph.byId.get(edge.to);
      const entry = governing.get(edge.to) ?? {
        id: edge.to,
        type: doc?.type ?? (edge.to.startsWith('REQ-') ? 'requirement' : 'decision'),
        title: doc?.title ?? '(not found)',
        status: doc?.status ?? 'missing',
        citedBy: [],
      };
      entry.citedBy.push({ workOrder: match.id, rel: edge.rel });
      governing.set(edge.to, entry);
    }
  }
  const ordered = [...governing.values()].sort((a, b) =>
    a.type === b.type ? idNumber(a.id) - idNumber(b.id) : a.type === 'requirement' ? -1 : 1,
  );

  return {
    path: target,
    matches,
    module: coveringModule(moduleRegistry(documents), target),
    governing: ordered,
  };
}

/** Render the lookup for terminals and tool results — one implementation,
    so the CLI and MCP surfaces print byte-identical text (DEC-038). */
export function renderIntent(lookup: IntentLookup): string {
  const lines: string[] = [`# Intent · ${lookup.path}`, ''];
  lines.push(
    'Grounded in what this knowledge base records — work-order bindings, receipts,',
    'and the module registry — not a code index.',
    '',
  );

  if (lookup.module !== undefined) {
    lines.push('## Module', '', `${lookup.module.name} · ${lookup.module.path} — ${lookup.module.purpose}`, '');
  }

  lines.push('## Work orders', '');
  if (lookup.matches.length === 0) {
    lines.push(
      lookup.module === undefined
        ? `nothing recorded touches ${lookup.path} — no binding, receipt, or module covers it`
        : `no document-level matches — no work-order binding or receipt touches ${lookup.path}; the module entry above is the only coverage`,
      '',
    );
  } else {
    for (const match of lookup.matches) {
      lines.push(`${match.id.padEnd(8)} ${match.status.padEnd(12)} via ${match.via} (${match.evidence}) — ${match.title}`);
    }
    lines.push('');
  }

  if (lookup.governing.length > 0) {
    lines.push('## Governing documents', '');
    for (const doc of lookup.governing) {
      const cites = doc.citedBy.map((cite) => `${cite.workOrder} (${cite.rel})`).join(', ');
      lines.push(`${doc.id.padEnd(8)} ${doc.status.padEnd(10)} ${doc.title} — via ${cites}`);
    }
    lines.push('');
  }

  return lines.join('\n').trimEnd();
}
