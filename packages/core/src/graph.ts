import type { VeriDocument } from './types.ts';

export interface Edge {
  from: string;
  to: string;
  rel: string;
  via: 'frontmatter' | 'inline' | 'superseded_by';
}

export interface LinkGraph {
  /** First document wins when ids collide; duplicates are reported by checkDuplicateIds. */
  byId: Map<string, VeriDocument>;
  edges: Edge[];
  outgoing(id: string): Edge[];
  backlinks(id: string): Edge[];
}

export function buildGraph(documents: VeriDocument[]): LinkGraph {
  const byId = new Map<string, VeriDocument>();
  for (const doc of documents) {
    if (!byId.has(doc.id)) byId.set(doc.id, doc);
  }

  const edges: Edge[] = [];
  for (const doc of documents) {
    for (const link of doc.links) {
      edges.push({ from: doc.id, to: link.id, rel: link.rel, via: 'frontmatter' });
    }
    if (doc.supersededBy !== undefined) {
      edges.push({ from: doc.id, to: doc.supersededBy, rel: 'superseded-by', via: 'superseded_by' });
    }
    for (const ref of doc.inlineRefs) {
      edges.push({ from: doc.id, to: ref, rel: 'mentions', via: 'inline' });
    }
  }

  const out = new Map<string, Edge[]>();
  const inc = new Map<string, Edge[]>();
  const push = (map: Map<string, Edge[]>, key: string, edge: Edge): void => {
    const list = map.get(key);
    if (list) list.push(edge);
    else map.set(key, [edge]);
  };
  for (const edge of edges) {
    push(out, edge.from, edge);
    push(inc, edge.to, edge);
  }

  return {
    byId,
    edges,
    outgoing: (id) => out.get(id) ?? [],
    backlinks: (id) => inc.get(id) ?? [],
  };
}
