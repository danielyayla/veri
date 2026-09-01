import type { VeriDocument } from './types.ts';
import type { ModuleEntry } from './schema.ts';
import { pathMatchesBinds } from './binds.ts';
import { moduleRegistry } from './architecture.ts';
import { buildGraph } from './graph.ts';

/**
 * Code-to-intent lookup (WO-095, REQ-021): from a repo-relative path to the
 * documents that govern it, derived from what the knowledge base already
 * records — work-order code bindings (WO-088) and the module registry on
 * the workflow document (DEC-059). No code parsing, no index, no git: pure
 * over loaded documents (DEC-040), so every surface — CLI, MCP, a future
 * app panel — serves the identical derivation (DEC-038). Receipts left
 * this derivation with their file lists (DEC-142, WO-141): a receipt is a
 * pointer into git, and the shipped-work answer is git's — `veri
 * implemented` reads it from commit subjects.
 */

/** How a work order came to touch the path (DEC-099, narrowed by DEC-142):
    a binding — a live claim by in-flight work. The receipt tier retired
    with receipt file lists. */
export type IntentVia = 'binding';

export interface IntentMatch {
  id: string;
  title: string;
  status: string;
  via: IntentVia;
  /** The recorded token that matched: a binds pattern. */
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
  /** Matched work orders, newest id first. */
  matches: IntentMatch[];
  /** The registry module covering the path, when one does. */
  module?: ModuleEntry;
  governing: GoverningDoc[];
}

const normalize = (path: string): string => path.replace(/^\.\//, '').replace(/\/+$/, '');

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
    // order is done, git history is the record — `veri implemented` reads
    // it — so a lingering broad glob stops claiming the file (DEC-099).
    if (doc.binds === undefined || doc.status === 'done') continue;
    const evidence = bindingEvidence(target, doc.binds.paths);
    if (evidence === undefined) continue;
    matches.push({
      id: doc.id,
      title: doc.title,
      status: doc.status,
      via: 'binding',
      evidence,
    });
  }
  matches.sort((a, b) => idNumber(b.id) - idNumber(a.id));

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
    'Grounded in what this knowledge base records — work-order bindings and',
    'the module registry — not a code index.',
    '',
  );

  if (lookup.module !== undefined) {
    lines.push('## Module', '', `${lookup.module.name} · ${lookup.module.path} — ${lookup.module.purpose}`, '');
  }

  lines.push('## Work orders', '');
  if (lookup.matches.length === 0) {
    lines.push(
      lookup.module === undefined
        ? `nothing recorded touches ${lookup.path} — no binding or module covers it`
        : `no document-level matches — no work-order binding touches ${lookup.path}; the module entry above is the only coverage`,
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
